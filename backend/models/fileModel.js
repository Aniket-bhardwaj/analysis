const db = require('../initialize_db');

function insertFile(filename, storedName, callback) {
  const sql = `INSERT INTO uploaded_files (filename, stored_name) VALUES (?, ?)`;
  db.run(sql, [filename, storedName], function(err) {
    if (err) return callback(err);
    // Return inserted row info
    const selectSql = `SELECT * FROM uploaded_files WHERE id = ?`;
    db.get(selectSql, [this.lastID], callback);
  });
}

function getVisibleFiles(callback) {
  const sql = `SELECT * FROM uploaded_files WHERE hidden = 0 ORDER BY uploaded_at DESC`;
  db.all(sql, [], callback);
}

function hideFileById(id, callback) {
  const sql = `UPDATE uploaded_files SET hidden = 1 WHERE id = ?`;
  db.run(sql, [id], function(err) {
    if (err) return callback(err);
    callback(null, { success: true });
  });
}

function getFileByStoredName(storedName, callback) {
  const sql = `SELECT * FROM uploaded_files WHERE stored_name = ?`;
  db.get(sql, [storedName], callback);
}

module.exports = {
  insertFile,
  getVisibleFiles,
  hideFileById,
  getFileByStoredName
};
