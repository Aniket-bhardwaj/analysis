const db = require('../initialize_db');

// ==========================
// 1. Insertion & Mapping
// ==========================

function insertQCRow(columns, values) {
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO qc_data (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function sampleExists(label, fileId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM sample_data WHERE "Solution Label" = ? AND file_id = ?',
      [label, fileId],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

function insertSample(row, fileId) {
  const columns = ['file_id', ...Object.keys(row).map(k => `"${k}"`)];
  const placeholders = ['?', ...Object.keys(row).map(() => '?')].join(', ');
  const values = [fileId, ...Object.values(row)];

  const sql = `INSERT INTO sample_data (${columns.join(', ')}) VALUES (${placeholders})`;

  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function updateSample(label, row, fileId) {
  const entries = Object.entries(row).filter(([key]) => key !== 'Solution Label');
  const setClause = entries.map(([key]) => `"${key}" = ?`).join(', ');
  const values = entries.map(([_, val]) => val);

  const sql = `UPDATE sample_data 
               SET ${setClause} 
               WHERE "Solution Label" = ? AND file_id = ? 
               RETURNING id`;

  return new Promise((resolve, reject) => {
    db.get(sql, [...values, label, fileId], (err, row) => {
      if (err) reject(err);
      else resolve(row?.id);
    });
  });
}

function insertRestData(row, fileId) {
  const columns = ['file_id', ...Object.keys(row).map(k => `"${k}"`)];
  const placeholders = ['?', ...Object.keys(row).map(() => '?')].join(', ');
  const values = [fileId, ...Object.values(row)];

  const sql = `INSERT INTO rest_data (${columns.join(', ')}) VALUES (${placeholders})`;

  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function updateRestData(label, row, fileId) {
  const entries = Object.entries(row).filter(([key]) => key !== 'Solution Label');
  const setClause = entries.map(([key]) => `"${key}" = ?`).join(', ');
  const values = entries.map(([_, val]) => val);

  const sql = `
    UPDATE rest_data
    SET ${setClause}
    WHERE "Solution Label" = ? AND file_id = ?
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, [...values, label, fileId], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

function insertSampleFileMapping(sampleId, fileId) {
  const sql = `INSERT INTO sample_id_X_file_id (sample_id, file_id) VALUES (?, ?)`;
  return new Promise((resolve, reject) => {
    db.run(sql, [sampleId, fileId], function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

// ==========================
// 2. QC MES & Correction Factor Logic
// ==========================

// 🔧 Patched: now uses dynamic labels instead of hardcoding 'QC MES%'
async function getAllQCMESRows(fileId) {
  const labels = await getQCLabelsForFile(fileId);
  // Pick only those starting with "Standard" or "QC"
  const filtered = labels.filter(l => l.startsWith('Standard') || l.startsWith('QC'));
  if (!filtered.length) return [];

  const sql = `SELECT * FROM qc_data WHERE file_id = ? AND "Solution Label" IN (${filtered.map(() => '?').join(', ')})`;
  return new Promise((resolve, reject) => {
    db.all(sql, [fileId, ...filtered], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getQCAveragesByLabel(fileId, label, elementCols) {
  if (!elementCols.length) {
    return Promise.reject(new Error('No element columns provided for averaging'));
  }

  const avgExpressions = elementCols
    .map(col => `AVG("${col}") AS "${col}"`)
    .join(', ');

  const sql = `
    SELECT ${avgExpressions}
    FROM qc_data
    WHERE file_id = ? AND "Solution Label" = ?
  `;

  return new Promise((resolve, reject) => {
    db.get(sql, [fileId, label], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}



function getSampleIdsForFile(fileId) {
  const sql = `SELECT sample_id FROM sample_id_X_file_id WHERE file_id = ?`;
  return new Promise((resolve, reject) => {
    db.all(sql, [fileId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.sample_id));
    });
  });
}

function getStdIdsForFile(fileId) {
  const sql = `SELECT id FROM qc_data WHERE file_id = ? AND "Solution Label" = ?`;
  return new Promise((resolve, reject) => {
    db.all(sql, [fileId, 'SJS-Std'], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.id));
    });
  });
}


function getSampleById(id, elementCols) {
  const colsString = elementCols
    .map(col => `"${col.replace(/"/g, '""')}"`)
    .join(', ');
  const sql = `SELECT ${colsString} FROM sample_data WHERE id = ?`;
  
  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getStdById(id, elementCols) {
  const colsString = elementCols
    .map(col => `"${col.replace(/"/g, '""')}"`)
    .join(', ');
  const sql = `SELECT ${colsString} FROM qc_data WHERE id = ?`;
  
  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function updateStdCorrectedValues(id, updates) {
// <<<<<<< HEAD
//   const qcFields = ["error_pct", "tolerance_pct", "rsd_pct", "status"];

//   const setClause = Object.keys(updates)
//     .map(k => {
//       let col;
//       if (qcFields.includes(k)) {
     
//         col = k;
//       } else {
    
//         col = k.endsWith("_Corrected") ? k : `${k}_Corrected`;
//       }
//       return `"${col.replace(/"/g, '""')}" = ?`;
//     })
//     .join(', ');

// =======
  const setClause = Object.keys(updates).map(k => `"${k}" = ?`).join(', ');
// >>>>>>> 957ba64e058e3187abc2493f2c2974d68ad92b64
  const values = Object.values(updates);
  const sql = `UPDATE qc_data SET ${setClause} WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.run(sql, [...values, id], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}



function updateSampleCorrectedValues(id, updates) {
  const setClause = Object.keys(updates)
    .map(k => {
      const col = k.endsWith("_Corrected") ? k : `${k}_Corrected`;
      return `"${col.replace(/"/g, '""')}" = ?`;
    })
    .join(', ');
  const values = Object.values(updates);
  const sql = `UPDATE sample_data SET ${setClause} WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.run(sql, [...values, id], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}



function getQCLabelsForFile(fileId) {
  const sql = `SELECT DISTINCT "Solution Label" AS label FROM qc_data WHERE file_id = ?`;
  return new Promise((resolve, reject) => {
    db.all(sql, [fileId], (err, rows) => {
      if (err) {
        console.error("Error fetching QC labels:", err);
        reject(err);
      } else {
        resolve(rows.map(r => r.label));
      }
    });
  });
}

function removeSampleFileMappings(sampleId) {
  const sql = `DELETE FROM sample_id_X_file_id WHERE sample_id = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, [sampleId], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

function runSQL(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

module.exports = {
  insertQCRow,
  sampleExists,
  insertSample,
  updateSample,
  insertRestData,
  updateRestData,
  insertSampleFileMapping,
  removeSampleFileMappings,

  
  getAllQCMESRows,
  getQCAveragesByLabel,
  getQCLabelsForFile,


  getSampleIdsForFile,
  getStdIdsForFile,
  getSampleById,
  getStdById,
  updateSampleCorrectedValues,
  updateStdCorrectedValues,

  runSQL
};

