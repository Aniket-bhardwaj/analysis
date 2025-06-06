const db = require('../initialize_db');

// === 1. File & Sample Insertion ===

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

function sampleExists(label) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM sample_data WHERE "Solution Label" = ?', [label], (err, row) => {
      if (err) reject(err);
      else resolve(!!row);
    });
  });
}

function insertSample(row) {
  const columns = Object.keys(row).map(k => `"${k}"`);
  const placeholders = Object.keys(row).map(() => '?').join(', ');
  const values = Object.values(row);
  const sql = `INSERT INTO sample_data (${columns.join(', ')}) VALUES (${placeholders})`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function updateSample(label, row) {
  const entries = Object.entries(row).filter(([key]) => key !== 'Solution Label');
  const setClause = entries.map(([key]) => `"${key}" = ?`).join(', ');
  const values = entries.map(([_, val]) => val);
  const sql = `UPDATE sample_data SET ${setClause} WHERE "Solution Label" = ? RETURNING id`;

  return new Promise((resolve, reject) => {
    db.get(sql, [...values, label], (err, row) => {
      if (err) reject(err);
      else resolve(row?.id);
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

// === 2. QC MES Extraction & Factor Logic ===

function getAllQCMESRows(fileId) {
  const sql = `SELECT * FROM qc_data WHERE "Solution Label" LIKE 'QC MES%' AND file_id = ?`;
  return new Promise((resolve, reject) => {
    db.all(sql, [fileId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getQCAveragesByLabel(fileId, label, elementColumns) {
  const avgExpr = elementColumns.map(col => `AVG(CAST("${col}" AS REAL)) AS "${col}"`).join(', ');
  const sql = `SELECT ${avgExpr} FROM qc_data WHERE "Solution Label" = ? AND file_id = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [label, fileId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// === 3. Sample Data Correction ===

function getSampleIdsForFile(fileId) {
  const sql = `SELECT sample_id FROM sample_id_X_file_id WHERE file_id = ?`;
  return new Promise((resolve, reject) => {
    db.all(sql, [fileId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.sample_id));
    });
  });
}

function getSampleById(id) {
  const sql = `SELECT * FROM sample_data WHERE id = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function updateSampleCorrectedValues(id, updates) {
  const setClause = Object.keys(updates).map(k => `"${k}" = ?`).join(', ');
  const values = Object.values(updates);
  const sql = `UPDATE sample_data SET ${setClause} WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.run(sql, [...values, id], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  // Insertion & Mapping
  insertQCRow,
  sampleExists,
  insertSample,
  updateSample,
  insertSampleFileMapping,

  // QC MES and Factors
  getAllQCMESRows,
  getQCAveragesByLabel,

  // Sample Correction
  getSampleIdsForFile,
  getSampleById,
  updateSampleCorrectedValues,
};
