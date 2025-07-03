const db = require('../initialize_db');

class ElementModel {
  static async getElementCorrectedValues(correctedElementName) {
    return new Promise((resolve, reject) => {
      const safeColumn = `"${correctedElementName}"`;

      const sql = `
        SELECT sd."Solution Label" AS sample_name, ${safeColumn} AS value
        FROM sample_data sd
        WHERE sd."Solution Label" LIKE 'MCS%' AND ${safeColumn} IS NOT NULL
        ORDER BY sd."Solution Label" ASC
      `;

      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('DB Error in getElementCorrectedValues:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = ElementModel;
