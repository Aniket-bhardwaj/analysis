const db = require('../database.sqlite');

// 1. Get file_id based on sampleId and expected file type
exports.getFileIdForSampleAndType = (sampleId, type) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT f.file_id
      FROM sample_id_X_file_id f
      JOIN uploaded_files u ON f.file_id = u.id
      WHERE f.sample_id = ? AND u.type = ?
      LIMIT 1;
    `;
    db.get(sql, [sampleId, type], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.file_id : null);
    });
  });
};

// 2. Get value and status of cleaned element from sample_data
exports.getElementValueAndStatus = (fileId, sampleId, elementName) => {
  return new Promise((resolve, reject) => {
    const valueColumn = `"${elementName}_Corrected"`;
    const statusColumn = `"${elementName}_Status"`;

    const sql = `
      SELECT ${valueColumn} AS value, ${statusColumn} AS status
      FROM sample_data
      WHERE id = ?;
    `;

    db.get(sql, [sampleId], (err, row) => {
      if (err) return reject(err);
      resolve(row || { value: null, status: null });
    });
  });
};
