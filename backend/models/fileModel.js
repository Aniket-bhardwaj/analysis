const db = require('../initialize_db');


// ==========================
// 1. Insert a New File
// ==========================
function insertFile(filename, filePath) {
  const sql = `INSERT INTO uploaded_files (filename, path) VALUES (?, ?)`;

  return new Promise((resolve, reject) => {
    db.run(sql, [filename, filePath], function (err) {
      if (err) return reject(err);

      const selectSql = `SELECT * FROM uploaded_files WHERE id = ?`;
      db.get(selectSql, [this.lastID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  });
}


// ==========================
// 2. Get All Visible Files
// ==========================
function getVisibleFiles() {
  const sql = `SELECT * FROM uploaded_files WHERE hidden = 0 ORDER BY uploaded_at DESC`;

  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}


// ==========================
// 3. Soft Delete (Hide) a File
// ==========================
function hideFileById(id) {
  const sql = `UPDATE uploaded_files SET hidden = 1 WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.run(sql, [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
}


// ==========================
// 4. Fetch File by Name
// ==========================
function getFileByName(storedName) {
  const sql = `SELECT * FROM uploaded_files WHERE filename = ?`;

  return new Promise((resolve, reject) => {
    db.get(sql, [storedName], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}


// ==========================
// 5. Check if File Already Exists
// ==========================
function fileExists(filename) {
  const sql = `SELECT COUNT(*) AS count FROM uploaded_files WHERE filename = ?`;

  return new Promise((resolve, reject) => {
    db.get(sql, [filename], (err, row) => {
      if (err) reject(err);
      else resolve(row.count > 0);
    });
  });
}


// ==========================
// Exports
// ==========================
module.exports = {
  insertFile,
  getVisibleFiles,
  hideFileById,
  getFileByName,
  fileExists,
};
