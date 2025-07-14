const db = require('../initialize_db');


class SampleModel{

// 1. Get file_id based on sampleId and expected file type
static async getFileIdForSampleAndType(sampleId, type){
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

static async getSamples(){
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT DISTINCT sd.id AS sample_id, sd."Solution Label" AS sample_name
      FROM sample_data sd
      JOIN sample_id_X_file_id sx ON sd.id = sx.sample_id
      JOIN uploaded_files uf ON sx.file_id = uf.id
      WHERE uf.hidden = 0;
    `;
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// 2. Get value and status of cleaned element from sample_data
static async getElementValueAndStatus (fileId, sampleId, elementName){
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

static async getFileTypesWithIdBySampleId(sampleId) {
  const sql = `
    SELECT DISTINCT u.id AS file_id, u.type
    FROM sample_id_X_file_id f
    JOIN uploaded_files u ON f.file_id = u.id
    WHERE f.sample_id = ? AND u.hidden = 0;
  `;

  return new Promise((resolve, reject) => {
    db.all(sql, [sampleId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows); // rows = [ { file_id: ..., type: ... }, ... ]
      }
    });
  });
}

static async getSampleRowByIdAndColumns(sampleId, columnNames) {
    // Clean each column name: wrap in double quotes to prevent SQL issues
    const safeColumns = columnNames.map(col => `"${col}"`).join(', ');
    const query = `SELECT ${safeColumns} FROM sample_data WHERE id = ?`;

    return new Promise((resolve, reject) => {
      db.get(query, [sampleId], (err, row) => {
        if (err) {
          console.error('DB error:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async getAvg(fileId, solutionLabel, columnNames) {
    // Sanitize column names to avoid wrapping already quoted ones
    const columnsSQL = columnNames.map(col => `AVG("${col}") AS "${col}"`).join(', ');

  
    const sql = `
      SELECT ${columnsSQL}
      FROM qc_data
      WHERE file_id = ? AND "Solution Label" = ?
    `;

    return new Promise((resolve, reject) => {
      db.get(sql, [fileId, solutionLabel], (err, row) => {
        if (err) {
          console.error("Error in getAvg SQL:", sql); // Helpful debug log
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async getFileNamesByFileIds(fileIds) {
    const placeholders = fileIds.map(() => '?').join(', ');
    const sql = `
      SELECT id, filename
      FROM uploaded_files
      WHERE id IN (${placeholders})
    `;
  
    return new Promise((resolve, reject) => {
      db.all(sql, fileIds, (err, rows) => {
        if (err) reject(err);
        else resolve(rows); // [{ id: 1, filename: 'abc.csv' }, ...]
      });
    });
  }
  

}

module.exports = SampleModel;