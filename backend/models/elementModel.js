const db = require('../initialize_db');

class ElementModel {
  static async getElementCorrectedValuesDetailed(correctedElementName) {
    return new Promise((resolve, reject) => {
      const safeColumn = `"${correctedElementName}"`;
  
      const sql = `
        SELECT 
          sd."Solution Label" AS sample_name, 
          sd.id AS sample_id,
          uf.id AS file_id,
          uf.type,
          ${safeColumn} AS value
        FROM sample_data sd
        JOIN sample_id_X_file_id sx ON sd.id = sx.sample_id
        JOIN uploaded_files uf ON sx.file_id = uf.id
        WHERE sd."Solution Label" LIKE 'MCS%' 
          AND ${safeColumn} IS NOT NULL 
          AND uf.hidden = 0
        ORDER BY sd."Solution Label" ASC
      `;
  
      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('DB Error in getElementCorrectedValuesDetailed:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
}

module.exports = ElementModel;
