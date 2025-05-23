const db = require('../initialize_db');

async function insertFile(filename, path, measuredTimestamp) {
  const sql = `
    INSERT INTO uploaded_files (filename, path, measured_timestamp)
    VALUES (?, ?, ?)
  `;
  return new Promise((resolve, reject) => {
    db.run(sql, [filename, path, measuredTimestamp], function (err) {
      if (err) return reject(err);
      console.log('Final timestamp to insert (inside db.run):', measuredTimestamp);
      resolve({
        id: this.lastID,
        filename,
        path,
        measuredTimestamp
      });
    });
  });
}

function getVisibleFiles() {
  const sql = `SELECT * FROM uploaded_files WHERE hidden = 0 ORDER BY uploaded_at DESC`;
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function hideFileById(id) {
  const sql = `UPDATE uploaded_files SET hidden = 1 WHERE id = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, [id], function(err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
}

function getFileByName(storedName) {
  const sql = `SELECT * FROM uploaded_files WHERE filename = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [storedName], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function fileExists(filename) {
  const sql = `SELECT COUNT(*) AS count FROM uploaded_files WHERE filename = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [filename], (err, row) => {
      if (err) reject(err);
      else resolve(row.count > 0);
    });
  });
}

module.exports = {
  insertFile,
  getVisibleFiles,
  hideFileById,
  getFileByName,
  fileExists,
};
