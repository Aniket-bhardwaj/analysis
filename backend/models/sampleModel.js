const db = require('../initialize_db');

class SampleModel {

  // 1. Get file_id for a sample + type (RBAC-safe)
  static async getFileIdForSampleAndType(sampleId, type, isAdmin, orgId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT f.file_id
        FROM sample_id_X_file_id f
        JOIN uploaded_files u ON f.file_id = u.id
        WHERE f.sample_id = ? 
          AND u.type = ?
          AND (
            (? = 1) OR (? = 0 AND u.org_id = ?)
          )
        LIMIT 1;
      `;
      db.get(sql, [sampleId, type, isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId], (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.file_id : null);
      });
    });
  }

  // 2. Get all samples (RBAC-safe)
  static async getSamples(isAdmin, orgId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT DISTINCT sd.id AS sample_id, sd."Solution Label" AS sample_name
        FROM sample_data sd
        JOIN sample_id_X_file_id sx ON sd.id = sx.sample_id
        JOIN uploaded_files uf ON sx.file_id = uf.id
        WHERE uf.hidden = 0
          AND (
            (? = 1) OR (? = 0 AND uf.org_id = ?)
          )
      `;
      db.all(sql, [isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // 3. Get element value + status (sample_data-only, no org filter needed here)
  static async getElementValueAndStatus(fileId, sampleId, elementName) {
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
  }

  // 4. Get file types linked to a sample (RBAC-safe)
  static async getFileTypesWithIdBySampleId(sampleId, isAdmin, orgId) {
    const sql = `
      SELECT DISTINCT u.id AS file_id, u.type
      FROM sample_id_X_file_id f
      JOIN uploaded_files u ON f.file_id = u.id
      WHERE f.sample_id = ? 
        AND u.hidden = 0
        AND (
          (? = 1) OR (? = 0 AND u.org_id = ?)
        )
    `;
    return new Promise((resolve, reject) => {
      db.all(sql, [sampleId, isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // 5. Fetch specific sample row by columns (still safe — sample_data-only)
  static async getSampleRowByIdAndColumns(sampleId, columnNames) {
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

  // 6. Get averages (qc_data is file-bound → add RBAC)
  static async getAvg(fileId, solutionLabel, columnNames, isAdmin, orgId) {
    const columnsSQL = columnNames.map(col => `AVG("${col}") AS "${col}"`).join(', ');

    const sql = `
      SELECT ${columnsSQL}
      FROM qc_data q
      JOIN uploaded_files u ON q.file_id = u.id
      WHERE q.file_id = ?
        AND q."Solution Label" = ?
        AND (
          (? = 1) OR (? = 0 AND u.org_id = ?)
        )
    `;
    return new Promise((resolve, reject) => {
      db.get(sql, [fileId, solutionLabel, isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId], (err, row) => {
        if (err) {
          console.error("Error in getAvg SQL:", sql);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 7. File names by IDs (RBAC-safe)
  static async getFileNamesByFileIds(fileIds, isAdmin, orgId) {
    const placeholders = fileIds.map(() => '?').join(', ');
    const sql = `
      SELECT id, filename
      FROM uploaded_files
      WHERE id IN (${placeholders})
        AND (
          (? = 1) OR (? = 0 AND org_id = ?)
        )
    `;
    return new Promise((resolve, reject) => {
      db.all(sql, [...fileIds, isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = SampleModel;



// const db = require('../initialize_db');


// class SampleModel{

// // 1. Get file_id based on sampleId and expected file type
// static async getFileIdForSampleAndType(sampleId, type){
//   return new Promise((resolve, reject) => {
//     const sql = `
//       SELECT f.file_id
//       FROM sample_id_X_file_id f
//       JOIN uploaded_files u ON f.file_id = u.id
//       WHERE f.sample_id = ? AND u.type = ?
//       LIMIT 1;
//     `;
//     db.get(sql, [sampleId, type], (err, row) => {
//       if (err) return reject(err);
//       resolve(row ? row.file_id : null);
//     });
//   });
// };

// static async getSamples(){
//   return new Promise((resolve, reject) => {
//     const sql = `
//       SELECT DISTINCT sd.id AS sample_id, sd."Solution Label" AS sample_name
//       FROM sample_data sd
//       JOIN sample_id_X_file_id sx ON sd.id = sx.sample_id
//       JOIN uploaded_files uf ON sx.file_id = uf.id
//       WHERE uf.hidden = 0;
//     `;
//     db.all(sql, [], (err, rows) => {
//       if (err) reject(err);
//       else resolve(rows);
//     });
//   });
// };

// // 2. Get value and status of cleaned element from sample_data
// static async getElementValueAndStatus (fileId, sampleId, elementName){
//   return new Promise((resolve, reject) => {
//     const valueColumn = `"${elementName}_Corrected"`;
//     const statusColumn = `"${elementName}_Status"`;

//     const sql = `
//       SELECT ${valueColumn} AS value, ${statusColumn} AS status
//       FROM sample_data
//       WHERE id = ?;
//     `;

//     db.get(sql, [sampleId], (err, row) => {
//       if (err) return reject(err);
//       resolve(row || { value: null, status: null });
//     });
//   });
// };

// static async getFileTypesWithIdBySampleId(sampleId) {
//   const sql = `
//     SELECT DISTINCT u.id AS file_id, u.type
//     FROM sample_id_X_file_id f
//     JOIN uploaded_files u ON f.file_id = u.id
//     WHERE f.sample_id = ? AND u.hidden = 0;
//   `;

//   return new Promise((resolve, reject) => {
//     db.all(sql, [sampleId], (err, rows) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(rows); // rows = [ { file_id: ..., type: ... }, ... ]
//       }
//     });
//   });
// }

// static async getSampleRowByIdAndColumns(sampleId, columnNames) {
//     // Clean each column name: wrap in double quotes to prevent SQL issues
//     const safeColumns = columnNames.map(col => `"${col}"`).join(', ');
//     const query = `SELECT ${safeColumns} FROM sample_data WHERE id = ?`;

//     return new Promise((resolve, reject) => {
//       db.get(query, [sampleId], (err, row) => {
//         if (err) {
//           console.error('DB error:', err.message);
//           reject(err);
//         } else {
//           resolve(row);
//         }
//       });
//     });
//   }

//   static async getAvg(fileId, solutionLabel, columnNames) {
//     // Sanitize column names to avoid wrapping already quoted ones
//     const columnsSQL = columnNames.map(col => `AVG("${col}") AS "${col}"`).join(', ');

  
//     const sql = `
//       SELECT ${columnsSQL}
//       FROM qc_data
//       WHERE file_id = ? AND "Solution Label" = ?
//     `;

//     return new Promise((resolve, reject) => {
//       db.get(sql, [fileId, solutionLabel], (err, row) => {
//         if (err) {
//           console.error("Error in getAvg SQL:", sql); // Helpful debug log
//           reject(err);
//         } else {
//           resolve(row);
//         }
//       });
//     });
//   }

//   static async getFileNamesByFileIds(fileIds) {
//     const placeholders = fileIds.map(() => '?').join(', ');
//     const sql = `
//       SELECT id, filename
//       FROM uploaded_files
//       WHERE id IN (${placeholders})
//     `;
  
//     return new Promise((resolve, reject) => {
//       db.all(sql, fileIds, (err, rows) => {
//         if (err) reject(err);
//         else resolve(rows); // [{ id: 1, filename: 'abc.csv' }, ...]
//       });
//     });
//   }
  

// }

// module.exports = SampleModel;