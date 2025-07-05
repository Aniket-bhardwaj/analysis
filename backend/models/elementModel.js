const db = require('../initialize_db');

class ElementModel {
// models/ElementModel.js
// models/ElementModel.js
static async getElementCorrectedValuesDetailed(
  correctedElementName,
  { file_id = null, start_date = null, end_date = null } = {}
) {
  return new Promise((resolve, reject) => {
    const safeColumn = `"${correctedElementName}"`;
    const whereClauses = [
      `sd."Solution Label" LIKE 'MCS%'`,
      `${safeColumn} IS NOT NULL`,
      `uf.hidden = 0`
    ];
    const params = [];

    // apply file filter if present
    if (file_id) {
      whereClauses.push(`uf.id = ?`);
      params.push(file_id);

    // otherwise apply date range if present
    } else if (start_date && end_date) {
      // strip time portion if needed (ensure YYYY-MM-DD)
      const sd = start_date.slice(0, 10);
      const ed = end_date.slice(0, 10);
      whereClauses.push(`DATE(uf.uploaded_at) BETWEEN DATE(?) AND DATE(?)`);
      params.push(sd, ed);
    }

    const sql = `
      SELECT
        sd."Solution Label" AS sample_name,
        sd.id               AS sample_id,
        uf.id               AS file_id,
        uf.type,
        ${safeColumn}       AS value
      FROM sample_data sd
      JOIN sample_id_X_file_id sx ON sd.id = sx.sample_id
      JOIN uploaded_files    uf   ON sx.file_id = uf.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY sd."Solution Label" ASC
    `;

    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('DB Error in getElementCorrectedValuesDetailed:', err.message);
        return reject(err);
      }
      resolve(rows);
    });
  });
}

}

module.exports = ElementModel;
