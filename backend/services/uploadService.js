const fileModel = require('../models/fileModel');
const dataModel = require('../models/dataModel');
const csvHandler = require('../utils/csvHandler');
const { MEconc, TEconc } = require('../colHeaders');
const { OTstdcleaned, OMstdcleaned } = require("../colHeaders");
const qcl = {
  1: 'QC MES 5 ppm',
  2: 'QC MES 50 ppb',
};

// ==========================
// 1. File Validation
// ==========================
async function validate(filePath, originalName) {
  try {
    if (await fileModel.fileExists(originalName)) {
      return { error: 'File already present', samples: null, qc: null, csvType: null, headers: null };
    }

    const firstLine = await csvHandler.getHeaders(1, filePath);
    const csvType = csvHandler.checkCsvType(firstLine);
    if (csvType === 0) {
      return { error: 'Unrecognized CSV structure', samples: null, qc: null, csvType, headers: null };
    }

    const headers = await csvHandler.getHeaders(csvType, filePath);
    if (!csvHandler.validateHeaders(headers, csvType)) {
      return { error: 'Invalid or mismatched headers', samples: null, qc: null, csvType, headers };
    }

    const rows = await csvHandler.parseDataRows(filePath, headers);
    if (!rows.length) {
      return { error: 'No valid data rows', samples: null, qc: null, csvType, headers };
    }

    const { samples, qc } = csvHandler.splitSamplesAndQc(rows);
    if (!samples.length || !qc.length) {
      return { error: 'Either no samples or no QC rows', samples: null, qc: null, csvType, headers };
    }

    csvHandler.validateQcLabels(qc);
    return { error: null, samples, qc, csvType, headers };
  } catch (err) {
    console.error('[validate] Error:', err.message);
    return { error: err.message || 'Validation failed', samples: null, qc: null, csvType: null, headers: null };
  }
}

// ==========================
// 2. Insert Raw CSV Data
// ==========================
async function insertAllData(
  originalName,
  savedFilePath,
  samples,
  qc,
  csvType,
  headers,
  pdfOriginalName,
  pdfSavedPath,
  orgId,
  createdByUserId,
  isAdmin = false 
) {
  let fileId;

  // 1) Insert file metadata
  try {
    // decide whether this is a core (1) or attachment (2) upload
    const fileType = isAdmin ? 1 : 2;

    const fileRow = await fileModel.insertFile(
      originalName,
      savedFilePath,
      fileType,            // 👈 replace csvType with fileType
      pdfOriginalName,
      pdfSavedPath,
      orgId,
      createdByUserId
    );

    fileId = fileRow.id;
  } catch (err) {
    return { error: 'Failed to insert file metadata: ' + err.message, fileId: null };
  }

  // 2) Insert QC rows
  try {
    for (const row of qc) {
      const columns = ['file_id', ...Object.keys(row)];
      const values  = [fileId,     ...Object.values(row)];
      await dataModel.insertQCRow(columns, values);
    }
  } catch (err) {
    return { error: 'Failed to insert QC data: ' + err.message, fileId };
  }

  // 2b) Insert SJS rows
  
  try {
  const allCols = [...OTstdcleaned, ...OMstdcleaned];
  const correctedCols = allCols.map(c => `${c}_Corrected`);

  const placeholders = Array(correctedCols.length + 7).fill("?").join(", ");
  const insertSQL = `INSERT INTO sjs VALUES (${placeholders})`;

  const sjsStdSource = qc.find(r => r['Solution Label'] === 'SJS-Std') || {};
  const errorSource  = qc.find(r => r['Solution Label'] === 'Error')   || {};
  const cleanNumber = (v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === "string") {
      v = v.trim().replace(",", "");  // remove spaces/commas
    }
    const num = parseFloat(v);
    return isNaN(num) ? null : num;
  };

  const sjsStdRow = [
    null, fileId, "SJS-Std",
    ...correctedCols.map(col => {
      const baseCol = col.replace("_Corrected", "");
      return cleanNumber(sjsStdSource[baseCol]);
    }),
    null, null, null, null
  ];

  const errorRow = [
    null, fileId, "Error",
    ...correctedCols.map(col => {
      const baseCol = col.replace("_Corrected", "");
      return cleanNumber(errorSource[baseCol]);
    }),
    null, null, null, null
  ];

  await dataModel.runSQL(insertSQL, sjsStdRow);
  await dataModel.runSQL(insertSQL, errorRow);
  console.log("=== DEBUG QC ROW KEYS ===");
  console.log("SJS-Std keys:", Object.keys(sjsStdSource));
  console.log("Error keys:", Object.keys(errorSource));

  console.log(`SJS rows inserted for file ${fileId} into *_Corrected columns`);
  } catch (err) {
    console.error(`[insertAllData] Failed to insert SJS rows for file ${fileId}:`, err.message);
  }


  // 3) Filter sample columns
  const filteredRows = csvHandler.filterColumnsByKeys(samples, csvType, headers);

  // 4) Insert/update sample + mapping
  try {
    for (const { filtered1, filtered2 } of filteredRows) {
      const label   = filtered1['Solution Label'];
      const exists  = await dataModel.sampleExists(label, fileId);

      let sampleId;
      try {
        sampleId = exists
          ? await dataModel.updateSample(label, filtered1, fileId)
          : await dataModel.insertSample(filtered1, fileId);

        if (!sampleId) {
          return { error: `Failed to handle sample "${label}"`, fileId };
        }

        if (exists) {
          await dataModel.updateRestData(label, filtered2, fileId);
        } else {
          await dataModel.insertRestData(filtered2, fileId);
        }

      } catch (err) {
        return { error: `Failed to process sample "${label}": ${err.message}`, fileId };
      }

      try {
        await dataModel.removeSampleFileMappings(sampleId);
        await dataModel.insertSampleFileMapping(sampleId, fileId);
      } catch (err) {
        return { error: `Failed to map sample "${label}" to file: ${err.message}`, fileId };
      }
    }
  } catch (err) {
    return { error: 'Failed to process sample data: ' + err.message, fileId };
  }
  try {
    const correctionResult = await insertCorrected(fileId, csvType, headers);
    if (correctionResult.error) {
      console.error(`Correction failed for file ${fileId}:`, correctionResult.error);
    } else {
      console.log(`Correction applied for file ${fileId}`);
    }
  } catch (err) {
    console.error(`[insertAllData] Correction step failed for file ${fileId}:`, err.message);
  }
  return { error: null, fileId };
}


// 3. Apply Correction Factors



async function insertCorrected(fileId, csvType, headers) {
  try {
    const allowedCols = csvType === 1 ? MEconc : TEconc;
    const elementCols = headers.filter(header => allowedCols.includes(header));

    //  get all QC labels dynamically 
    const qcLabels = await dataModel.getQCLabelsForFile(fileId);
    if (!qcLabels || qcLabels.length === 0) {
      throw new Error("No QC labels found for this file");
    }

    // Pick the first "Standard" row if present, otherwise fallback
    const chosenQC = qcLabels.find(l => l.startsWith("Standard")) || qcLabels[0];
    console.log(`[insertCorrected] Using QC reference label: ${chosenQC}`);

    // fetch averages for that chosen QC label
    const averages = await dataModel.getQCAveragesByLabel(fileId, chosenQC, elementCols);

    const known = csvType === 1 ? 5 : 50; 
    //  calculate correction factors
    const factors = {};
    for (const [key, avg] of Object.entries(averages)) {
      if (avg !== null && !isNaN(avg)) {
        factors[key] = (known - avg) / known;
      }
    }

    // apply to all sample rows
    const sampleIds = await dataModel.getSampleIdsForFile(fileId);
    for (const sampleId of sampleIds) {
      const row = await dataModel.getSampleById(sampleId, elementCols);
      if (!row) continue;

      const updates = {};
      for (const [element, factor] of Object.entries(factors)) {
        const rawVal = row[element];
        if (rawVal !== null && !isNaN(parseFloat(rawVal))) {
          updates[`${element}_Corrected`] = parseFloat(rawVal) * (1 + factor);
        }
      }

      if (Object.keys(updates).length > 0) {
        await dataModel.updateSampleCorrectedValues(sampleId, updates);
      }
    }

    // apply to SJS-Std rows
    const stdIds = await dataModel.getStdIdsForFile(fileId);

    for (const stdId of stdIds) {
      const updates = {};

      // fetch the stored SJS-Std row values
      const correctedCols = elementCols.map(c => `${c}_Corrected`);
      const sjsStdRow = await dataModel.getStdById(stdId, correctedCols);

      for (const col of elementCols) {
        const avg = averages[col];
        const factor = factors[col];

        // 🔑 fetch the correct DB column name
        const dbCol = `${col}_Corrected`;
        const sjsStd = parseFloat(sjsStdRow[dbCol]);

        console.log("[DEBUG SJS]", {
          stdId,
          dbCol,
          avg,
          sjsStd,
          factor,
        });

        if (
          avg != null &&
          !isNaN(avg) &&
          !isNaN(sjsStd) &&
          sjsStd !== 0 &&
          factor !== undefined
        ) {
          const correctedVal = avg * (1 + factor);
          updates[dbCol] = correctedVal;

          const errorPct = ((avg - sjsStd) / sjsStd) * 100;
          updates.error_pct = +errorPct.toFixed(2);
          updates.tolerance_pct = 10;
          updates.status = Math.abs(errorPct) <= 10 ? "Pass" : "Fail";
        }
      }

      updates.rsd_pct = 0;


      if (Object.keys(updates).length > 0) {
        await dataModel.updateStdCorrectedValues(stdId, updates);
      }
    }

    return { error: null };
  } catch (err) {
    console.error("[insertCorrected] Error:", err.message);
    return { error: "Failed to apply correction factors: " + err.message };
  }
}

module.exports = {
  validate,
  insertAllData,
  insertCorrected,
};
