const db = require('../initialize_db');

// ==========================
// 1) Insert a New File (CSV + optional PDF) with RBAC fields
// ==========================
/**
 * Inserts a record into uploaded_files.
 * @param {string} originalName
 * @param {string} savedFilePath
 * @param {number} csvType
 * @param {string|null} pdfOriginalName
 * @param {string|null} pdfSavedPath
 * @param {number|null} orgId
 * @param {number|null} createdByUserId
 * @returns {Promise<{id:number}>}
 */
function insertFile(
  originalName,
  savedFilePath,
  csvType,
  pdfOriginalName,
  pdfSavedPath,
  orgId,
  createdByUserId
) {
  return new Promise((resolve, reject) => {
    // uploaded_files.pdfname and pdf_path are NOT NULL per schema, so store empty string when absent
    const pdfNameForDb = pdfOriginalName || '';
    const pdfPathForDb = pdfSavedPath || '';

    db.run(
      `INSERT INTO uploaded_files
         (filename, path, pdfname, pdf_path, uploaded_at, type, hidden, org_id, created_by_user_id)
       VALUES
         (?,        ?,    ?,       ?,        CURRENT_TIMESTAMP, ?,    0,      ?,     ?)`,
      [originalName, savedFilePath, pdfNameForDb, pdfPathForDb, csvType, orgId ?? null, createdByUserId ?? null],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      }
    );
  });
}

// ==========================
// 2) Get All Visible Files (non-admin use; remains for compatibility)
//     Note: also returns owner/org info now
// ==========================
function getVisibleFiles() {
  const sql = `
    SELECT
      f.id, f.filename, f.path, f.pdfname, f.pdf_path, f.uploaded_at, f.type, f.hidden, f.org_id, f.created_by_user_id,
      u.email  AS owner_email,
      o.name   AS org_name
    FROM uploaded_files f
    LEFT JOIN users u ON f.created_by_user_id = u.id
    LEFT JOIN organizations o ON f.org_id = o.id
    WHERE f.hidden = 0
    ORDER BY f.uploaded_at DESC
  `;
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// ==========================
// 3) Soft Delete (Hide) a File
// ==========================
function hideFileById(id, name) {
  const sql = `UPDATE uploaded_files SET hidden = 1, filename = ? WHERE id = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, [name, id], function (err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
}

// ==========================
// 4) Check if File Already Exists
// ==========================
function fileExists(filename) {
  const sql = `SELECT COUNT(*) AS count FROM uploaded_files WHERE filename = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [filename], (err, row) => (err ? reject(err) : resolve(row.count > 0)));
  });
}

// ==========================
// 5) Get file by ID (full metadata)
// ==========================
function getFileById(fileId) {
  const sql = `
    SELECT
      f.id, f.filename, f.path, f.pdfname, f.pdf_path, f.uploaded_at, f.type, f.hidden, f.org_id, f.created_by_user_id,
      u.email  AS owner_email,
      o.name   AS org_name
    FROM uploaded_files f
    LEFT JOIN users u ON f.created_by_user_id = u.id
    LEFT JOIN organizations o ON f.org_id = o.id
    WHERE f.id = ?
    LIMIT 1
  `;
  return new Promise((resolve, reject) => {
    db.get(sql, [fileId], (err, row) => (err ? reject(err) : resolve(row)));
  });
}

// ==========================
// 6) Get type of file by ID
// ==========================
function getTypeById(fileId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT type FROM uploaded_files WHERE id = ?`, [fileId], (err, row) => {
      if (err) return reject(err);
      resolve(row?.type ?? null);
    });
  });
}

// ==========================
// 7) Get File IDs + Types by Date Range (original behavior)
// ==========================
function getFileIdsByDateRange(startDate, endDate) {
  const sql = `
    SELECT id, type FROM uploaded_files
    WHERE uploaded_at BETWEEN ? AND ?
      AND hidden = 0
  `;
  const start = `${startDate} 00:00:00`;
  const end   = `${endDate} 23:59:59`;
  return new Promise((resolve, reject) => {
    db.all(sql, [start, end], (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// (helper) If you *also* need just the IDs for some legacy callers, keep it under a different name
function getFileIdsByDateRangeSimple(startDate, endDate) {
  const startIso = `${startDate} 00:00:00.000Z`;
  const endIso   = `${endDate} 23:59:59.999Z`;
  const sql = `
    SELECT id FROM uploaded_files
    WHERE uploaded_at BETWEEN ? AND ?
    ORDER BY uploaded_at ASC
  `;
  return new Promise((resolve, reject) => {
    db.all(sql, [startIso, endIso], (err, rows) => {
      if (err) return reject(new Error('Database query failed while fetching file IDs.'));
      resolve(rows.map(r => r.id));
    });
  });
}

// ==========================
// 8) Distinct file types by date range
// ==========================
function getFileTypesByDateRange(startDate, endDate) {
  const sql = `
    SELECT DISTINCT type FROM uploaded_files
    WHERE uploaded_at BETWEEN ? AND ?
      AND hidden = 0
  `;
  const start = `${startDate} 00:00:00`;
  const end   = `${endDate} 23:59:59`;
  return new Promise((resolve, reject) => {
    db.all(sql, [start, end], (err, rows) => {
      if (err) return reject(err);
      const types = rows.map(r => r.type).sort();
      resolve(types);
    });
  });
}

// ==========================
// 9) Get Metadata by file_id
// ==========================
function getFileMetadata(fileId) {
  const sql = `
    SELECT filename, uploaded_at, type
    FROM uploaded_files
    WHERE id = ?
  `;
  return new Promise((resolve, reject) => {
    db.get(sql, [fileId], (err, row) => (err ? reject(err) : resolve(row)));
  });
}

// ==========================
// 10) RBAC-aware list for a user (admin sees all; clients see their org & non-hidden)
//      Also returns owner + org details
// ==========================
function listFilesForUser(isAdmin, orgId) {
  const sql = `
    SELECT
      f.id, f.filename, f.path, f.pdfname, f.pdf_path, f.uploaded_at, f.type, f.hidden, f.org_id, f.created_by_user_id,
      u.email  AS owner_email,
      o.name   AS org_name
    FROM uploaded_files f
    LEFT JOIN users u ON f.created_by_user_id = u.id
    LEFT JOIN organizations o ON f.org_id = o.id
    WHERE ( ? = 1 OR f.hidden = 0 )
      AND ( ? = 1 OR f.org_id = ? )
    ORDER BY f.uploaded_at DESC
  `;
  const adminBit = isAdmin ? 1 : 0;
  return new Promise((resolve, reject) => {
    db.all(sql, [adminBit, adminBit, orgId ?? null], (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// ==========================
// 11) RBAC-aware single-by-ID (download, pdf, preview by id)
// ==========================
function getFileByIdForUser(id, isAdmin, orgId) {
  const sql = `
    SELECT
      f.id, f.filename, f.path, f.pdfname, f.pdf_path, f.uploaded_at, f.type, f.hidden, f.org_id, f.created_by_user_id,
      u.email  AS owner_email,
      o.name   AS org_name
    FROM uploaded_files f
    LEFT JOIN users u ON f.created_by_user_id = u.id
    LEFT JOIN organizations o ON f.org_id = o.id
    WHERE f.id = ?
      AND ( ? = 1 OR f.hidden = 0 )
      AND ( ? = 1 OR f.org_id = ? )
    LIMIT 1
  `;
  const adminBit = isAdmin ? 1 : 0;
  return new Promise((resolve, reject) => {
    db.get(sql, [id, adminBit, adminBit, orgId ?? null], (err, row) => (err ? reject(err) : resolve(row)));
  });
}

// ==========================
// 12) RBAC-aware single-by-name (used by filename preview route)
// ==========================
function getFileByNameForUser(filename, isAdmin, orgId) {
  const sql = `
    SELECT
      f.id, f.filename, f.path, f.pdfname, f.pdf_path, f.uploaded_at, f.type, f.hidden, f.org_id, f.created_by_user_id,
      u.email  AS owner_email,
      o.name   AS org_name
    FROM uploaded_files f
    LEFT JOIN users u ON f.created_by_user_id = u.id
    LEFT JOIN organizations o ON f.org_id = o.id
    WHERE f.filename = ?
      AND ( ? = 1 OR f.hidden = 0 )
      AND ( ? = 1 OR f.org_id = ? )
    LIMIT 1
  `;
  const adminBit = isAdmin ? 1 : 0;
  return new Promise((resolve, reject) => {
    db.get(sql, [filename, adminBit, adminBit, orgId ?? null], (err, row) => (err ? reject(err) : resolve(row)));
  });
}

// ==========================
// Exports
// ==========================
module.exports = {
  insertFile,
  getVisibleFiles,
  hideFileById,
  fileExists,
  getFileById,
  getTypeById,
  getFileIdsByDateRange,       // id + type
  getFileIdsByDateRangeSimple, // just ids (renamed to avoid duplicate)
  getFileTypesByDateRange,
  getFileMetadata,
  listFilesForUser,
  getFileByIdForUser,
  getFileByNameForUser,
};




