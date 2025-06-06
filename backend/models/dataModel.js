const db = require('../initialize_db');


// ==========================
// 1. Insertion & Mapping
// ==========================

/**
 * Insert a single QC row into qc_data table.
 */
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

/**
 * Check if a sample already exists by its label.
 */
function sampleExists(label) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM sample_data WHERE "Solution Label" = ?', [label], (err, row) => {
      if (err) reject(err);
      else resolve(!!row);
    });
  });
}

/**
 * Insert a new sample row into sample_data.
 */
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

/**
 * Update an existing sample row using its label.
 */
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

/**
 * Insert mapping between sample and file into sample_id_X_file_id.
 */
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

/**
 * Get all QC rows that begin with 'QC MES' for a given file.
 */
function getAllQCMESRows(fileId) {
  const sql = `SELECT * FROM qc_data WHERE "Solution Label" LIKE 'QC MES%' AND file_id = ?`;
  return new Promise((resolve, reject) => {
    db.all(sql, [fileId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Get average values for each element column for a specific QC label and file.
 */
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


// ==========================
// 3. Apply Correction to Data
// ==========================

/**
 * Get sample IDs linked to a file from mapping table.
 */
function getSampleIdsForFile(fileId) {
  const sql = `SELECT sample_id FROM sample_id_X_file_id WHERE file_id = ?`;
  return new Promise((resolve, reject) => {
    db.all(sql, [fileId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.sample_id));
    });
  });
}

/**
 * Get IDs of all SJS-Std rows from qc_data for a file.
 */
function getStdIdsForFile(fileId) {
  const sql = `SELECT id FROM qc_data WHERE file_id = ? AND "Solution Label" = ?`;
  return new Promise((resolve, reject) => {
    db.all(sql, [fileId, 'SJS-Std'], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.id));
    });
  });
}

/**
 * Fetch sample_data row by ID.
 */
function getSampleById(id) {
  const sql = `SELECT * FROM sample_data WHERE id = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Fetch qc_data row by ID (used for SJS-Std corrections).
 */
function getStdById(id) {
  const sql = `SELECT * FROM qc_data WHERE id = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Update corrected values for a sample in sample_data.
 */
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

/**
 * Update corrected values for a standard row in qc_data (SJS-Std).
 */
function updateStdCorrectedValues(id, updates) {
  const setClause = Object.keys(updates).map(k => `"${k}" = ?`).join(', ');
  const values = Object.values(updates);
  const sql = `UPDATE qc_data SET ${setClause} WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.run(sql, [...values, id], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}


// ==========================
// Exports
// ==========================
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

  // Sample & Std Correction
  getSampleIdsForFile,
  getStdIdsForFile,
  getSampleById,
  getStdById,
  updateSampleCorrectedValues,
  updateStdCorrectedValues
};
