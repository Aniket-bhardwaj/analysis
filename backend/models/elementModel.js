const db = require('../initialize_db');

class ElementModel {
  // models/ElementModel.js
static async getElementCorrectedValuesDetailed(
  correctedElementName,
  { file_id = null, start_date = null, end_date = null } = {}
) {
  return new Promise((resolve, reject) => {
    const safeCol = `"${correctedElementName}"`;

    /* base filters */
    const whereClauses = [
      `sd."Solution Label" LIKE 'MCS%'`,
      `${safeCol} IS NOT NULL`,
      `uf.hidden = 0`
    ];
    const params = [];

    /* ── filter by file OR date window ─────────────────────── */
    if (file_id) {
      whereClauses.push(`uf.id = ?`);
      params.push(file_id);

    } else if (start_date && end_date) {
      //  ➜ cast both sides to DATE so “2025-07-01 10:45:00” matches “2025-07-01”
      whereClauses.push(`DATE(uf.uploaded_at) BETWEEN DATE(?) AND DATE(?)`);
      params.push(start_date, end_date);
    }

    const sql = `
      SELECT
        sd."Solution Label" AS sample_name,
        sd.id               AS sample_id,
        uf.id               AS file_id,
        uf.type,
        ${safeCol}          AS value
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
