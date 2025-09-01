const path = require("path");
const { Parser } = require("json2csv");
const AdmZip = require("adm-zip");
const downloadModel = require("../models/downloadModel");
const fileModel = require("../models/fileModel");
const dataModel = require("../models/dataModel");
const { MEconc, TEconc } = require("../colHeaders");

class DownloadService {
  async createZipWithCSVs(fileId) {
    // 🔹 Step 0: Get file type (1 = ME, 2 = TE)
    const type = await fileModel.getTypeById(fileId);
    console.log(type + " is the type");
    if (!type) throw new Error("File type not found");

    // 🔹 Step 0.1: Fetch file info (paths etc.)
    const fileInfo = await downloadModel.getFileInfo(fileId);
    if (!fileInfo) throw new Error("File not found");

    // 🔹 Map type → QC label & concentration headers
    const qclMap = { 1: "QC MES 5 ppm", 2: "QC MES 50 ppb" };
    const concMap = { 1: MEconc, 2: TEconc };

    const qcl = qclMap[type];
    const elementList = concMap[type];
    if (!qcl || !elementList) throw new Error("Invalid type for QC");

    // 🔹 Build corrected column names for ALL elements
    const allCorr = elementList.map(
      (name) => `${name}_Corrected`
    );

    // 🔹 Fetch QC + sample rows for ALL elements (raw + corrected)
    const qcRows = await downloadModel.getQCDataRows(
      fileId,
      elementList,
      allCorr
    );
    const sampleRows = await downloadModel.getSampleDataRows(
      fileId,
      allCorr
    );

    // 🔹 Rename QC rows so raw columns become _Corrected
    const qcRenamed = renameKeysForQCOnly(qcRows, elementList);

    // 🔹 Merge QC + sample into one full dataset
    const Rows = qcRenamed.concat(sampleRows);

    // 🔹 Export CSV of ALL corrected values
    const fields = ["Solution Label", "Timestamp", ...allCorr];
    const parser = new Parser({ fields: fields, header: true });
    const allCsv = parser.parse(Rows);

    // 🔹 Step 1: Calculate averages for QC label
    const avgRow = await dataModel.getQCAveragesByLabel(
      fileId,
      qcl,
      elementList
    );

    // 🔹 Step 2: Define pass/fail range (±10%)
    const target = type === 1 ? 5 : 50;
    const lower = target * 0.9;
    const upper = target * 1.1;

    // 🔹 Step 2.1: Build map of element → Pass/Fail
    const elementStatusMap = {};
    for (const elementName of elementList) {
      const avg = avgRow ? avgRow[elementName] : null;

      let status = "-";
      if (avg != null) {
        status = avg >= lower && avg <= upper ? "Pass" : "Fail";
      }
      elementStatusMap[elementName] = status;
    }

    // 🔹 Step 3: Split elements into passed & failed groups
    const passedElements = Object.entries(elementStatusMap)
      .filter(([_, status]) => status === "Pass")
      .map(([name]) => name);

    const failedElements = Object.entries(elementStatusMap)
      .filter(([_, status]) => status === "Fail")
      .map(([name]) => name);

    // 🔹 Step 4: Create corrected versions for passed/failed
    const passedElementsCorr = passedElements.map(
      (name) => `${name}_Corrected`
    );
    const failedElementsCorr = failedElements.map(
      (name) => `${name}_Corrected`
    );

    // 🔹 Step 5: Query rows separately for passed and failed
    const qcPassedRows = await downloadModel.getQCDataRows(
      fileId,
      passedElements,
      passedElementsCorr
    );
    const qcFailedRows = await downloadModel.getQCDataRows(
      fileId,
      failedElements,
      failedElementsCorr
    );
    const samplePassedRows = await downloadModel.getSampleDataRows(
      fileId,
      passedElementsCorr
    );
    const sampleFailedRows = await downloadModel.getSampleDataRows(
      fileId,
      failedElementsCorr
    );

    // 🔹 Helper: detect if a row is a QC row
    function isQCRow(row) {
      return row["Solution Label"]?.startsWith("QC");
    }

    // 🔹 Helper: For QC rows, rename raw → _Corrected
    function renameKeysForQCOnly(rows, originalElements) {
      return rows.map((row) => {
        if (!isQCRow(row)) return row;
        const newRow = { ...row };
        for (const key of originalElements) {
          if (key in newRow) {
            newRow[`${key}_Corrected`] = newRow[key];
            delete newRow[key];
          }
        }
        return newRow;
      });
    }

    // 🔹 Step 6: Apply renaming to QC passed/failed, then merge with samples
    const qcPassedRenamed = renameKeysForQCOnly(qcPassedRows, passedElements);
    const qcFailedRenamed = renameKeysForQCOnly(qcFailedRows, failedElements);
    const passedRows = qcPassedRenamed.concat(samplePassedRows);
    const failedRows = qcFailedRenamed.concat(sampleFailedRows);

    // 🔹 Step 7: Export CSVs for passed and failed separately
    const passedFields = ["Solution Label", "Timestamp", ...passedElementsCorr];
    const failedFields = ["Solution Label", "Timestamp", ...failedElementsCorr];
    const parserPass = new Parser({ fields: passedFields, header: true });
    const parserFail = new Parser({ fields: failedFields, header: true });
    const passedCsv = parserPass.parse(passedRows);
    const failedCsv = parserFail.parse(failedRows);

    // 🔹 Step 8: Build ZIP
    const zip = new AdmZip();
    const projectRoot = path.join(__dirname, "..");

    // 🔹 Add original raw CSV but renamed with _RAW
    const originalPath = path.isAbsolute(fileInfo.path)
      ? fileInfo.path
      : path.join(projectRoot, fileInfo.path);

    const baseName = path.basename(originalPath); // e.g. "name.csv"
    const rawName = baseName.replace(/(\.[^.]+)?$/, "_RAW$1"); // → "name_RAW.csv"

    zip.addLocalFile(originalPath, "", rawName);

    // 🔹 Add generated CSV files
    zip.addFile("Passed_Elements.csv", Buffer.from(passedCsv, "utf-8"));
    zip.addFile("Failed_Elements.csv", Buffer.from(failedCsv, "utf-8"));
    zip.addFile("All_Elements_Corrected.csv", Buffer.from(allCsv, "utf-8"));

    // 🔹 Add PDF file if present in fileInfo
    if (fileInfo.pdf_path) {
      const pdfPath = path.isAbsolute(fileInfo.pdf_path)
        ? fileInfo.pdf_path
        : path.join(projectRoot, fileInfo.pdf_path);

      try {
        zip.addLocalFile(pdfPath);
      } catch (err) {
        // Log but don’t throw if PDF is missing
        console.error(`Could not find or add PDF file: ${pdfPath}`, err);
      }
    }

    // 🔹 Final: return zip buffer + filename
    const zipBuffer = zip.toBuffer();

    return {
      buffer: zipBuffer,
      filename: `${path.parse(fileInfo.filename).name}_bundle.zip`,
    };
  }
}

module.exports = new DownloadService();
