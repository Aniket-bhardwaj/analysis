const fileModel = require('../models/fileModel');
const dataModel = require('../models/dataModel');
const {
  parseHeaders,
  checkColumnCount,
  validateHeaderNames,
  parseDataRows,
  splitSamplesAndQC,
  validateQcLabels
} = require('../utils/csvHandler');


// ==========================
// 1. File Validation
// ==========================
async function validate(filePath, originalName) {
  try {
    // Check if file already exists
    const exists = await fileModel.fileExists(originalName);
    if (exists) {
      return { error: 'File already present', samples: null, qc: null };
    }

    // Parse and validate headers
    const headers = await parseHeaders(filePath);
    const csvType = checkColumnCount(headers);

    if (csvType === 0 || !validateHeaderNames(headers, csvType)) {
      return { error: 'Invalid or unsupported CSV headers', samples: null, qc: null };
    }

    // Parse data rows
    const allRows = await parseDataRows(filePath);
    if (!Array.isArray(allRows) || allRows.length === 0) {
      return { error: 'No valid data rows found in CSV', samples: null, qc: null };
    }

    // Split samples and QC rows
    const { samples, qc } = splitSamplesAndQC(allRows);
    if (!samples?.length || !qc?.length) {
      return { error: 'Either no samples or no other labels', samples: null, qc: null };
    }

    //QC label validation
    try {
      validateQcLabels(qc, csvType);
      console.log('QC validation passed!');
    } catch (error) {
      return { error: error.message, samples: null, qc: null };
    }

    return { error: null, samples, qc };

  } catch (err) {
    console.error('[validate] Unexpected error:', err.message);
    return { error: 'Unexpected error while validating file', samples: null, qc: null };
  }
}


// ==========================
// 2. Insert Raw CSV Data
// ==========================
async function insertAllData(originalName, savedFilePath, samples, qc) {
  let fileId;

  // Step 1: Insert metadata (file info)
  try {
    const fileRow = await fileModel.insertFile(originalName, savedFilePath);
    fileId = fileRow.id;
  } catch (err) {
    return { error: 'Failed to insert file metadata: ' + err.message, fileId: null };
  }

  // Step 2: Insert QC rows
  try {
    for (const row of qc) {
      const columns = ['file_id', ...Object.keys(row)];
      const values = [fileId, ...Object.values(row)];
      await dataModel.insertQCRow(columns, values);
    }
  } catch (err) {
    return { error: 'Failed to insert QC data: ' + err.message, fileId };
  }

  // Step 3: Insert/Update Samples and Mapping
  try {
    for (const row of samples) {
      const label = row['Solution Label'];
      let sampleId;

      // Check if sample already exists
      const exists = await dataModel.sampleExists(label);

      // Insert or update the sample
      try {
        sampleId = exists
          ? await dataModel.updateSample(label, row)
          : await dataModel.insertSample(row);

        if (!sampleId) {
          return { error: `Failed to handle sample "${label}"`, fileId };
        }

      } catch (err) {
        return { error: `Failed to process sample "${label}": ${err.message}`, fileId };
      }

      // Map sample to file
      try {
        await dataModel.insertSampleFileMapping(sampleId, fileId);
      } catch (err) {
        return { error: `Failed to map sample "${label}" to file: ${err.message}`, fileId };
      }
    }
  } catch (err) {
    return { error: 'Failed to process sample data: ' + err.message, fileId };
  }

  return { error: null, fileId };
}


// ==========================
// 3. Apply Correction Factors
// ==========================
async function insertCorrected(fileId) {
  try {
    // Fetch QC MES rows
    const qcRows = await dataModel.getAllQCMESRows(fileId);
    if (!qcRows?.length) {
      return { error: 'No QC MES rows found for the given file_id.' };
    }

    const selectedRow = qcRows[0];
    const usedLabel = selectedRow["Solution Label"];

    // Identify element columns to correct
    const excludeCols = [
      'id', 'file_id', 'Solution Label', 'Timestamp', 'Sample', 'Rjct', 'Data File',
      'Acq. Date-Time', 'Type', 'Level', 'Total Dil.', 'Vial Number', 'Rack:Tube',
    ];
    const elementCols = Object.keys(selectedRow).filter(
      col => !excludeCols.includes(col) && selectedRow[col] !== null && selectedRow[col] !== ''
    );

    if (!elementCols.length) {
      return { error: 'No element columns with valid values found.' };
    }

    // Calculate correction factors
    const averages = await dataModel.getQCAveragesByLabel(fileId, usedLabel, elementCols);
    const known = parseFloat(usedLabel.match(/(\d+(\.\d+)?)/)?.[0]);

    if (isNaN(known)) {
      return { error: `Unable to extract numeric value from label: ${usedLabel}` };
    }

    const factors = {};
    for (const [key, avg] of Object.entries(averages)) {
      if (avg !== null && !isNaN(avg)) {
        factors[key] = (known - avg) / known;
      }
    }

    // Fetch sample IDs linked to this file
    const sampleIds = await dataModel.getSampleIdsForFile(fileId);
    if (!sampleIds.length) {
      return { error: `No samples found for file_id ${fileId}` };
    }

    // Apply corrections per sample
    for (const sampleId of sampleIds) {
      const row = await dataModel.getSampleById(sampleId);
      if (!row) continue;

      const updates = {};
      for (const [element, factor] of Object.entries(factors)) {
        const rawVal = row[element];
        if (rawVal !== null && !isNaN(parseFloat(rawVal))) {
          const corrected = parseFloat(rawVal) * (1 + factor);
          updates[`${element}_Corrected`] = corrected;
        }
      }

      // Update row if there are corrected values
      if (Object.keys(updates).length > 0) {
        await dataModel.updateSampleCorrectedValues(sampleId, updates);
      }
    }

    return { error: null };

  } catch (err) {
    console.error('[insertCorrected] Error:', err.message);
    return { error: 'Failed to apply correction factors: ' + err.message };
  }
}


// ==========================
// Exports
// ==========================
module.exports = {
  validate,
  insertAllData,
  insertCorrected,
};
