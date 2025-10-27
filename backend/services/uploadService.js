const fileModel = require('../models/fileModel');
const dataModel = require('../models/dataModel');
const csvHandler = require('../utils/csvHandler');
const { MEconc, TEconc } = require('../colHeaders');
const { OTstdcleaned, OMstdcleaned } = require("../colHeaders");
const db = require('../initialize_db');

async function ensureColumnsExist(table, columns) {
  // 1️⃣ Get current columns
  const existing = await new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table});`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.name));
    });
  });

  // 2️⃣ Add missing columns
  for (const col of columns) {
    if (!existing.includes(col)) {
      await new Promise((resolve, reject) => {
        const safe = `"${col.replace(/"/g, '""')}"`; // escape quotes for safety
        db.run(`ALTER TABLE ${table} ADD COLUMN ${safe} REAL;`, err => {
          if (err) reject(err);
          else {
            console.log(`🧩 Added missing column ${col} to ${table}`);
            resolve();
          }
        });
      });
    }
  }
}

const qcl = {
  1: 'QC MES 5 ppm',
  2: 'QC MES 50 ppb',
};

// ==========================
// 1. File Validation
// ==========================

async function validate(filePath, originalName, season = 'pre_basalt') {
  try {
    // --- Duplicate file check ---
    if (await fileModel.fileExists(originalName)) {
      return { error: 'File already present', samples: null, qc: null, csvType: null, headers: null };
    }

    // --- Detect CSV type ---
    const firstLine = await csvHandler.getHeaders(1, filePath);
    const csvType = csvHandler.checkCsvType(firstLine);
    if (csvType === 0) {
      return { error: 'Unrecognized CSV structure', samples: null, qc: null, csvType, headers: null };
    }

    // --- Extract and validate headers ---
    const headers = await csvHandler.getHeaders(csvType, filePath);
    if (!csvHandler.validateHeaders(headers, csvType)) {
      return { error: 'Invalid or mismatched headers', samples: null, qc: null, csvType, headers };
    }

    // --- Parse data rows ---
    const rows = await csvHandler.parseDataRows(filePath, headers);
    if (!rows.length) {
      return { error: 'No valid data rows', samples: null, qc: null, csvType, headers };
    }

    // ---Split into Samples and QC ---
    const { samples, qc } = csvHandler.splitSamplesAndQc(rows, season);
    if (!samples.length || !qc.length) {
      return { error: 'Either no samples or no QC rows', samples: null, qc: null, csvType, headers };
    }

   
    // This checks different expected QC label sets for pre_basalt vs post_basalt
    csvHandler.validateQcLabels(qc, season);

    // ---  Success ---
    return { error: null, samples, qc, csvType, headers };

  } catch (err) {
    console.error('[validate] Error:', err.message);
    return {
      error: err.message || 'Validation failed',
      samples: null,
      qc: null,
      csvType: null,
      headers: null
    };
  }
}


// ==========================
// 2. Insert Raw CSV Data
// ==========================

// async function insertAllData(
//   originalName,
//   savedFilePath,
//   samples,
//   qc,
//   csvType,
//   headers,
//   pdfOriginalName,
//   pdfSavedPath,
//   orgId,
//   createdByUserId,
//   isAdmin = false,
//   season = 'pre_basalt'
// ) {
//   let fileId;

//   // 1️⃣ Insert file metadata
//   try {
//     const fileType = isAdmin ? 1 : 2;
//     const fileRow = await fileModel.insertFile(
//       originalName,
//       savedFilePath,
//       fileType,
//       pdfOriginalName,
//       pdfSavedPath,
//       orgId,
//       createdByUserId,
//       season
//     );
//     fileId = fileRow.id;
//   } catch (err) {
//     return { error: 'Failed to insert file metadata: ' + err.message, fileId: null };
//   }

//   // 2️⃣ Insert QC rows
//   try {
//     for (const row of qc) {
//       const columns = ['file_id', ...Object.keys(row)];
//       const values = [fileId, ...Object.values(row)];
//       await dataModel.insertQCRow(columns, values);
//     }
//   } catch (err) {
//     return { error: 'Failed to insert QC data: ' + err.message, fileId };
//   }

//   // 3️⃣ Insert SJS / BHVO rows (season-aware)
//   try {
//     // 🧭 Select correct element list for each season
//     let allCols;
//     if (season === 'post_basalt') {
//       // BHVO / BCR tables have fewer elements — adjust accordingly
//       allCols = [...OTstdcleaned.slice(0, 20), ...OMstdcleaned.slice(0, 20)]; // Adjust to actual sjs_mcb column count
//     } else {
//       allCols = [...OTstdcleaned, ...OMstdcleaned];
//     }

//     // Normalize: remove any existing _Corrected suffix first
//     const correctedCols = allCols.map(c => c.replace(/_Corrected$/i, '') + '_Corrected');

//     const table = season === 'post_basalt' ? 'sjs_mcb' : 'sjs';

//     // Build insert columns dynamically
//     const columns = ['id', 'file_id', 'label', ...correctedCols, 'extra1', 'extra2', 'extra3', 'extra4'];
//     const placeholders = Array(columns.length).fill('?').join(', ');
//     const quotedCols = columns.map(c => `"${c}"`);
//     const insertSQL = `INSERT INTO ${table} (${quotedCols.join(', ')}) VALUES (${placeholders})`;
//     await ensureColumnsExist(table, [...correctedCols, 'extra1', 'extra2', 'extra3', 'extra4']);


//     // Pick correct standard label for the season
//     const stdLabel = season === 'post_basalt' ? 'BHVO-2 STD' : 'SJS-Std';
//     const sjsStdSource = qc.find(r => r['Solution Label'] === stdLabel) || {};
//     const errorSource = qc.find(r => r['Solution Label'] === 'Error') || {};

//     const cleanNumber = (v) => {
//       if (v === undefined || v === null) return null;
//       if (typeof v === "string") v = v.trim().replace(",", "");
//       const num = parseFloat(v);
//       return isNaN(num) ? null : num;
//     };

//     const makeRow = (label, source) => [
//       null,
//       fileId,
//       label,
//       ...correctedCols.map(col => {
//         const base = col.replace(/_Corrected$/i, '');
//         return cleanNumber(source[base] ?? source[col]);
//       })
//       ,
//       null, null, null, null,
//     ];

//     await dataModel.runSQL(insertSQL, makeRow(stdLabel, sjsStdSource));
//     await dataModel.runSQL(insertSQL, makeRow('Error', errorSource));

//     console.log(`✅ ${table} rows inserted (${columns.length} cols) for file ${fileId} (season=${season})`);
//   } catch (err) {
//     console.error(`[insertAllData] Failed to insert STD rows for file ${fileId}:`, err.message);
//   }

//   // 4️⃣ Filter sample columns
//   const filteredRows = csvHandler.filterColumnsByKeys(samples, csvType, headers);

//   // 5️⃣ Insert/update sample + mapping
//   try {
//     for (const { filtered1, filtered2 } of filteredRows) {
//       const label = filtered1['Solution Label'];
//       const exists = await dataModel.sampleExists(label, fileId);

//       let sampleId;
//       try {
//         sampleId = exists
//           ? await dataModel.updateSample(label, filtered1, fileId)
//           : await dataModel.insertSample(filtered1, fileId);

//         if (!sampleId) {
//           return { error: `Failed to handle sample "${label}"`, fileId };
//         }

//         if (exists) {
//           await dataModel.updateRestData(label, filtered2, fileId);
//         } else {
//           await dataModel.insertRestData(filtered2, fileId);
//         }
//       } catch (err) {
//         return { error: `Failed to process sample "${label}": ${err.message}`, fileId };
//       }

//       try {
//         await dataModel.removeSampleFileMappings(sampleId);
//         await dataModel.insertSampleFileMapping(sampleId, fileId);
//       } catch (err) {
//         return { error: `Failed to map sample "${label}" to file: ${err.message}`, fileId };
//       }
//     }
//   } catch (err) {
//     return { error: 'Failed to process sample data: ' + err.message, fileId };
//   }

//   // 6️⃣ Apply correction factors
//   try {
//     const correctionResult = await insertCorrected(fileId, csvType, headers);
//     if (correctionResult.error) {
//       console.error(`Correction failed for file ${fileId}:`, correctionResult.error);
//     } else {
//       console.log(`Correction applied for file ${fileId}`);
//     }
//   } catch (err) {
//     console.error(`[insertAllData] Correction step failed for file ${fileId}:`, err.message);
//   }

//   return { error: null, fileId };
// }



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
  isAdmin = false,
  season = 'pre_basalt'
) {
  let fileId;

  // 1️⃣ Insert file metadata
  try {
    const fileType = isAdmin ? 1 : 2;
    const fileRow = await fileModel.insertFile(
      originalName,
      savedFilePath,
      fileType,
      pdfOriginalName,
      pdfSavedPath,
      orgId,
      createdByUserId,
      season
    );
    fileId = fileRow.id;
  } catch (err) {
    return { error: 'Failed to insert file metadata: ' + err.message, fileId: null };
  }

  // 2️⃣ Insert QC rows
  try {
    for (const row of qc) {
      const columns = ['file_id', ...Object.keys(row)];
      const values = [fileId, ...Object.values(row)];
      await dataModel.insertQCRow(columns, values);
    }
  } catch (err) {
    return { error: 'Failed to insert QC data: ' + err.message, fileId };
  }

  // // 3️⃣ Insert SJS / BHVO rows (season-aware)
  // try {
  //   // 🧭 Choose correct element set
  //   let allCols;
  //   if (season === 'post_basalt') {
  //     // Use reduced column set for BHVO/BCR
  //     allCols = [...OTstdcleaned.slice(0, 20), ...OMstdcleaned.slice(0, 20)];
  //   } else {
  //     allCols = [...OTstdcleaned, ...OMstdcleaned];
  //   }

  //   // Generate corrected column names
  //   const correctedCols = allCols.map(c => c.replace(/_Corrected$/i, '') + '_Corrected');

  //   // Pick proper table
  //   const table = season === 'post_basalt' ? 'sjs_mcb' : 'sjs';

  //   // Dynamic SQL build (season-specific)
  //   let insertSQL;
  //   if (season === 'post_basalt') {
  //     // BHVO-2 reference table — static, no file_id or extras
  //     insertSQL = `INSERT INTO ${table} VALUES (${Array(correctedCols.length + 2).fill('?').join(', ')})`;
  //     await ensureColumnsExist(table, correctedCols);
  //   } else {
  //     // SJS reference — includes file_id and extras
  //     const columns = ['id', 'file_id', 'label', ...correctedCols, 'extra1', 'extra2', 'extra3', 'extra4'];
  //     const placeholders = Array(columns.length).fill('?').join(', ');
  //     const quotedCols = columns.map(c => `"${c}"`);
  //     insertSQL = `INSERT INTO ${table} (${quotedCols.join(', ')}) VALUES (${placeholders})`;
  //     await ensureColumnsExist(table, [...correctedCols, 'extra1', 'extra2', 'extra3', 'extra4']);
  //   }

  //   // Reference labels
  //   const stdLabel = season === 'post_basalt' ? 'BHVO-2 STD' : 'SJS-Std';
  //   const sjsStdSource = qc.find(r => r['Solution Label'] === stdLabel) || {};
  //   const errorSource = qc.find(r => r['Solution Label'] === 'Error') || {};

  //   const cleanNumber = (v) => {
  //     if (v === undefined || v === null) return null;
  //     if (typeof v === 'string') v = v.trim().replace(',', '');
  //     const num = parseFloat(v);
  //     return isNaN(num) ? null : num;
  //   };

  //   // Dynamic row builder
  //   const makeRow = (label, source) => {
  //     const values = correctedCols.map(col => {
  //       const base = col.replace(/_Corrected$/i, '');
  //       return cleanNumber(source[base] ?? source[col]);
  //     });
  //     if (season === 'post_basalt') {
  //       // sjs_mcb: id, label, ...values
  //       return [null, label, ...values];
  //     } else {
  //       // sjs: id, file_id, label, ...values, extras
  //       return [null, fileId, label, ...values, null, null, null, null];
  //     }
  //   };

  //   await dataModel.runSQL(insertSQL, makeRow(stdLabel, sjsStdSource));
  //   await dataModel.runSQL(insertSQL, makeRow('Error', errorSource));

  //   console.log(`✅ ${table} rows inserted (${correctedCols.length} cols) for file ${fileId} (season=${season})`);
  // } catch (err) {
  //   console.error(`[insertAllData] Failed to insert STD rows for file ${fileId}:`, err.message);
  // }

  // 4️⃣ Filter sample columns
  const filteredRows = csvHandler.filterColumnsByKeys(samples, csvType, headers);

  // 5️⃣ Insert/update sample + mapping
  try {
    for (const { filtered1, filtered2 } of filteredRows) {
      const label = filtered1['Solution Label'];
      const exists = await dataModel.sampleExists(label, fileId);

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


  return { error: null, fileId };
}


// 3. Apply Correction Factors
async function insertCorrected(fileId, csvType, headers,season) {


  try {
    // // Step 1: Get QC MES rows for this file
    // const qcRows = await dataModel.getAllQCMESRows(fileId);
    // const selectedRow = qcRows[0];
    // const usedLabel = selectedRow["Solution Label"];

    // Step 2: Determine applicable element columns
    const allowedCols = csvType === 1 ? MEconc : TEconc;
    const elementCols = headers.filter(header => allowedCols.includes(header));



    // Step 3: Get average measured values
    const averages = await dataModel.getQCAveragesByLabel(fileId, qcl[csvType], elementCols);



    const known = csvType === 1 ? 5 : 50; // e.g., extract 50 from "QC MES 50"

    // Step 4: Calculate correction factors
    const factors = {};
    for (const [key, avg] of Object.entries(averages)) {
      if (avg !== null && !isNaN(avg)) {
        factors[key] = (known - avg) / known;
      }
    }

    // Step 5: Apply correction to samples
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

    // Step 6: Apply correction to SJS-Std rows
    const stdIds = await dataModel.getStdIdsForFile(fileId,season);
 

    for (const stdId of stdIds) {
      const row = await dataModel.getStdById(stdId, elementCols);
      if (!row) continue;

      const updates = {};
      for (const [element, factor] of Object.entries(factors)) {
        const rawVal = row[element];
        if (rawVal !== null && !isNaN(parseFloat(rawVal))) {
          updates[`${element}_Corrected`] = parseFloat(rawVal) * (1 + factor);
        }
      }

      if (Object.keys(updates).length > 0) {
        await dataModel.updateStdCorrectedValues(stdId, updates);
      }
    }

    return { error: null };

  } catch (err) {
    console.error('[insertCorrected] Error:', err.message);
    return { error: 'Failed to apply correction factors: ' + err.message };
  }
}


module.exports = {
  validate,
  insertAllData,
  insertCorrected,
};
