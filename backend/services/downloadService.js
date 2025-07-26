const path = require('path');
const { Parser } = require('json2csv');
const AdmZip = require('adm-zip');
const downloadModel = require('../models/downloadModel');
const { MEconc, TEconc } = require('../colHeaders');

class DownloadService {
  async createZipWithCSVs(fileId) {
    const type = await downloadModel.getFileType(fileId);
    if (!type) throw new Error('File type not found');

    const fileInfo = await downloadModel.getFileInfo(fileId);
    if (!fileInfo) throw new Error('File not found');

    const qclMap = { 1: "QC MES 5 ppm", 2: "QC MES 50 ppb" };
    const concMap = { 1: MEconc, 2: TEconc };

    const qcl = qclMap[type];
    const elementList = concMap[type];
    if (!qcl || !elementList) throw new Error('Invalid type for QC');

    // Steps 1-7 remain unchanged...

    // ✅ Step 1: Get averages
    const avgRow = await downloadModel.getAvg(fileId, qcl, elementList);

    // ✅ Step 2: Pass/Fail check
    const target = type === 1 ? 5 : 50;
    const lower = target * 0.9;
    const upper = target * 1.1;

    const elementStatusMap = {};
    for (const elementName of elementList) {
      const avg = avgRow ? avgRow[elementName] : null;

      let status = '-';
      if (avg != null) {
        status = avg >= lower && avg <= upper ? 'Pass' : 'Fail';
      }
      elementStatusMap[elementName] = status;
    }

    // ✅ Step 3: Get passed and failed elements
    const passedElements = Object.entries(elementStatusMap)
      .filter(([_, status]) => status === 'Pass')
      .map(([name]) => name);

    const failedElements = Object.entries(elementStatusMap)
      .filter(([_, status]) => status === 'Fail')
      .map(([name]) => name);

    // ✅ Step 4: Add _Corrected suffix
    const passedElementsCorr = passedElements.map(name => `${name}_Corrected`);
    const failedElementsCorr = failedElements.map(name => `${name}_Corrected`);

    // ✅ Step 5: Query data
    const qcPassedRows = await downloadModel.getQCDataRows(fileId, passedElements, passedElementsCorr);
    const qcFailedRows = await downloadModel.getQCDataRowsForFailed(fileId, failedElements, failedElementsCorr);
    const samplePassedRows = await downloadModel.getSampleDataRows(fileId, passedElementsCorr);
    const sampleFailedRows = await downloadModel.getSampleDataRows(fileId, failedElementsCorr);

    function isQCRow(row) {
      return row['Solution Label']?.startsWith('QC');
    }

    function renameKeysForQCOnly(rows, originalElements) {
      return rows.map(row => {
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

    // ✅ Step 6: Combine rows
    const qcPassedRenamed = renameKeysForQCOnly(qcPassedRows, passedElements);
    const qcFailedRenamed = renameKeysForQCOnly(qcFailedRows, failedElements);
    const passedRows = qcPassedRenamed.concat(samplePassedRows);
    const failedRows = qcFailedRenamed.concat(sampleFailedRows);

    // ✅ Step 7: Create CSVs
    const passedFields = ['Solution Label', 'Timestamp', ...passedElementsCorr];
    const failedFields = ['Solution Label', 'Timestamp', ...failedElementsCorr];
    const parserPass = new Parser({ fields: passedFields, header: true });
    const parserFail = new Parser({ fields: failedFields, header: true });
    const passedCsv = parserPass.parse(passedRows);
    const failedCsv = parserFail.parse(failedRows);

    // ✅ Step 8: Zip
    const zip = new AdmZip();
    const projectRoot = path.join(__dirname, '..');

    // Add original CSV file
    const originalPath = path.isAbsolute(fileInfo.path)
        ? fileInfo.path
        : path.join(projectRoot, fileInfo.path);
    zip.addLocalFile(originalPath);

    // Add generated CSV files
    zip.addFile('Passed_Elements.csv', Buffer.from(passedCsv, 'utf-8'));
    zip.addFile('Failed_Elements.csv', Buffer.from(failedCsv, 'utf-8'));
    
    // 💡 CHANGE: Add the PDF file to the zip if its path exists
    if (fileInfo.pdf_path) {
        const pdfPath = path.isAbsolute(fileInfo.pdf_path)
            ? fileInfo.pdf_path
            : path.join(projectRoot, fileInfo.pdf_path);
        
        try {
            zip.addLocalFile(pdfPath);
        } catch (err) {
            // Log an error if PDF is not found, but don't crash the whole process
            console.error(`Could not find or add PDF file: ${pdfPath}`, err);
        }
    }

    const zipBuffer = zip.toBuffer();

    return {
      buffer: zipBuffer,
      filename: `${path.parse(fileInfo.filename).name}_bundle.zip`
    };
  }
}

module.exports = new DownloadService();