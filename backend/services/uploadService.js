const path = require('path');
//const fs = require('fs');
const fileModel = require('../models/fileModel');
const dataModel = require('../models/dataModel');
const {
  parseHeaders,
  checkColumnCount,
  validateHeaderNames,
  parseDataRows,
  splitSamplesAndQC,
} = require('../utils/csvHandler');

async function validate(filePath, originalName) {
  try {
    // Step 1: Check if file already exists in DB
    const exists = await fileModel.fileExists(originalName);
    if (exists) {
      return {
        error: 'File already present',
        samples: null,
        qc: null,
      };
    }

    // Step 2: Parse headers
    const headers = await parseHeaders(filePath);
    const csvType = checkColumnCount(headers);

    if (csvType === 0 || !validateHeaderNames(headers, csvType)) {
      return {
        error: 'Invalid or unsupported CSV headers',
        samples: null,
        qc: null,
      };
    }

    // Step 3: Parse data rows (skipping 2nd row internally)
    const allRows = await parseDataRows(filePath);
    if (!Array.isArray(allRows) || allRows.length === 0) {
      return {
        error: 'No valid data rows found in CSV',
        samples: null,
        qc: null,
      };
    }

    // Step 4: Split into samples and QC rows
    const { samples, qc } = splitSamplesAndQC(allRows);
    if ((!samples || samples.length === 0) || (!qc || qc.length === 0)) {
      return {
        error: 'Either no samples or no other labels',
        samples: null,
        qc: null,
      };
    }

    // All good — return the clean rows
    return {
      error: null,
      samples,
      qc,
    };

  } catch (err) {
    console.error('[validate] Unexpected error:', err.message);
    return {
      error: 'Unexpected error while validating file',
      samples: null,
      qc: null,
    };
  }
}


async function insertAllData(originalName, savedFilePath, samples, qc) {
  let fileId;

  // 1. Insert file metadata
  try {
    const fileRow = await fileModel.insertFile(originalName, savedFilePath);
    fileId = fileRow.id;
  } catch (err) {
    //console.error('[insertAllData] File insert error:', err.message);
    return { error: 'Failed to insert file metadata: ' + err.message, fileId: null };
  }

  // 2. Insert QC rows
  try {
    for (const row of qc) {
      const columns = ['file_id', ...Object.keys(row)];
      const values = [fileId, ...Object.values(row)];
      await dataModel.insertQCRow(columns, values);
    }
  } catch (err) {
    //console.error('[insertAllData] QC insert error:', err.message);
    return { error: 'Failed to insert QC data: ' + err.message, fileId };
  }

  // 3. Process samples and mapping
  try {
    for (const row of samples) {
      const solutionLabel = row['Solution Label'];
      let sampleId;

      // a. Check if sample exists
      const exists = await dataModel.sampleExists(solutionLabel);

      // b. Insert or update
      try {
        if (exists) {
          sampleId = await dataModel.updateSample(solutionLabel, row);
          if (!sampleId) {
            return { error: `Failed to fetch updated sample ID for "${solutionLabel}"`, fileId };
          }
        } else {
          sampleId = await dataModel.insertSample(row);
          if (!sampleId) {
            return { error: `Failed to insert sample for "${solutionLabel}"`, fileId };
          }
        }
      } catch (err) {
        //console.error(`[insertAllData] Sample insert/update error for "${solutionLabel}":`, err.message);
        return { error: `Failed to process sample "${solutionLabel}": ` + err.message, fileId };
      }

      // c. Insert mapping
      try {
        await dataModel.insertSampleFileMapping(sampleId, fileId);
      } catch (err) {
        //console.error(`[insertAllData] Mapping error for sample "${solutionLabel}":`, err.message);
        return {
          error: `Failed to map sample "${solutionLabel}" to file: ` + err.message,
          fileId,
        };
      }
    }
  } catch (err) {
    //console.error('[insertAllData] Sample loop error:', err.message);
    return { error: 'Failed to process sample data: ' + err.message, fileId };
  }

  return { error: null, fileId };
}

module.exports = {
  validate,
  insertAllData
};
