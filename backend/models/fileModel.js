const db = require("../initialize_db");

// ==========================
// 1) Insert a New File (CSV + optional PDF)
// ==========================
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
    const pdfNameForDb = pdfOriginalName || "";
    const pdfPathForDb = pdfSavedPath || "";

    db.run(
      `INSERT INTO uploaded_files
         (filename, file_path, pdfname, pdf_path, uploaded_at, type, hidden, org_id, created_by_user_id)
       VALUES
         (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 0, ?, ?)`,
      [originalName, savedFilePath, pdfNameForDb, pdfPathForDb, csvType, orgId ?? null, createdByUserId ?? null],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      }
    );
  });
}

// ==========================
// 2) Get All Visible Files
// ==========================
function getVisibleFiles() {
  const sql = `
    SELECT
      f.id, f.filename, f.file_path, f.pdfname, f.pdf_path, f.uploaded_at, f.type, f.hidden, f.org_id, f.created_by_user_id,
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
async function hideFileById(id, name, currentUserId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT type, created_by_user_id FROM uploaded_files WHERE id = ?`, [id], (err, row) => {
      if (err) return reject(err);
      if (!row) return reject(new Error("File not found"));
      if (row.type === 1 || row.created_by_user_id !== currentUserId) {
        return reject(new Error("You are not allowed to delete this file."));
      }

      db.run(`UPDATE uploaded_files SET hidden = 1, filename = ? WHERE id = ?`, [name, id], function (err2) {
        if (err2) reject(err2);
        else resolve({ success: true });
      });
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
      f.id, f.filename, f.file_path, f.pdfname, f.pdf_path, f.uploaded_at, f.type, f.hidden, f.org_id, f.created_by_user_id,
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
// 7) Get File IDs + Types by Date Range
// ==========================
function getFileIdsByDateRange(startDate, endDate) {
  const sql = `
    SELECT id, type FROM uploaded_files
    WHERE uploaded_at BETWEEN ? AND ?
      AND hidden = 0
  `;
  const start = `${startDate} 00:00:00`;
  const end = `${endDate} 23:59:59`;
  return new Promise((resolve, reject) => {
    db.all(sql, [start, end], (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// ==========================
// 8) Distinct file types by date range
// ==========================
// function getFileTypesByDateRange(startDate, endDate) {
//   const sql = `
//     SELECT DISTINCT type FROM uploaded_files
//     WHERE uploaded_at BETWEEN ? AND ?
//       AND hidden = 0
//   `;
//   const start = `${startDate} 00:00:00`;
//   const end = `${endDate} 23:59:59`;
//   return new Promise((resolve, reject) => {
//     db.all(sql, [start, end], (err, rows) => {
//       if (err) return reject(err);
//       const types = rows.map((r) => r.type).sort();
//       resolve(types);
//     });
//   });
// }

  function getFileTypesByDateRange(startDate, endDate, isAdmin = false, orgId = null) {
    const baseSql = `SELECT DISTINCT type FROM uploaded_files WHERE uploaded_at BETWEEN ? AND ? AND type IN (1, 2)`;
    const sql = isAdmin ? baseSql : `${baseSql} AND org_id = ?`;
    const params = isAdmin ? [`${startDate} 00:00:00`, `${endDate} 23:59:59`] : [`${startDate} 00:00:00`, `${endDate} 23:59:59`, orgId];
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows.map((r) => r.type).sort())));
    });
  }
// ==========================
// 9) RBAC-aware list for a user
// ==========================
function listFilesForUser(isAdmin, orgId) {
  const sql = `
    SELECT
      f.id, f.filename, f.file_path, f.pdfname, f.pdf_path, f.uploaded_at, f.type, f.hidden, f.org_id, f.created_by_user_id,
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
// 10) RBAC-aware single-by-ID
// ==========================
function getFileByIdForUser(id, isAdmin, orgId) {
  const sql = `
    SELECT
      f.id, f.filename, f.file_path, f.pdfname, f.pdf_path, f.uploaded_at, f.type, f.hidden, f.org_id, f.created_by_user_id,
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
// 11) RBAC-aware single-by-name
// ==========================
function getFileByNameForUser(filename, isAdmin, orgId) {
  const sql = `
    SELECT
      f.id, f.filename, f.file_path, f.pdfname, f.pdf_path, f.uploaded_at, f.type, f.hidden, f.org_id, f.created_by_user_id,
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
// 12) Get Metadata by file_id
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
// Exports
// ==========================
module.exports = {
  insertFile,
  getVisibleFiles,
  hideFileById,
  fileExists,
  getFileById,
  getTypeById,
  getFileIdsByDateRange,
  getFileTypesByDateRange,
  getFileMetadata,
  listFilesForUser,
  getFileByIdForUser,
  getFileByNameForUser,
};

