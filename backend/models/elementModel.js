const db = require('../initialize_db');
const { MEconc, TEconc } = require('../colHeaders'); // old element arrays stay

class ElementModel {
  /**
   * Fetch corrected element values with RBAC enforcement
   * (your existing logic retained exactly, only RBAC already added)
   */
  static async getElementCorrectedValuesDetailed({
    element,
    file_id = null,
    start_date = null,
    end_date = null,
    isAdmin = 0,
    orgId = null
  }) {
    return new Promise((resolve, reject) => {
      const safeColumn = `"${element}"`;
      const whereClauses = [
        `sd."Solution Label" LIKE 'MCS%'`,
        `${safeColumn} IS NOT NULL`,
        `uf.hidden = 0`
      ];
      const params = [];

      // File filter
      if (file_id) {
        whereClauses.push(`uf.id = ?`);
        params.push(file_id);
      }
      // Date range filter
      else if (start_date && end_date) {
        const sd = start_date.slice(0, 10);
        const ed = end_date.slice(0, 10);
        whereClauses.push(`DATE(uf.uploaded_at) BETWEEN DATE(?) AND DATE(?)`);
        params.push(sd, ed);
      }

      // RBAC filter
      whereClauses.push(`(? = 1 OR (? = 0 AND uf.org_id = ?))`);
      params.push(isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId);

      const sql = `
        SELECT
          sd."Solution Label" AS sample_name,
          sd.id               AS sample_id,
          uf.id               AS file_id,
          uf.type,
          ${safeColumn}       AS value
        FROM sample_data sd
        JOIN sample_id_X_file_id sx ON sd.id = sx.sample_id
        JOIN uploaded_files uf      ON sx.file_id = uf.id
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

  /**
   * NEW: Get available element names dynamically with RBAC
   * – keeps MEconc + TEconc as source list
   * – checks which ones actually have data for this org/admin
   */
  static async getAvailableElements({ isAdmin, orgId }) {
    return new Promise((resolve, reject) => {
      const allElements = [...MEconc, ...TEconc];
      const unionQueries = [];
      const params = [];

      allElements.forEach(el => {
        const safeColumn = `"${el}_Corrected"`;
        unionQueries.push(`
          SELECT '${el}' AS col_name
          FROM sample_data sd
          JOIN sample_id_X_file_id sx ON sd.id = sx.sample_id
          JOIN uploaded_files uf      ON sx.file_id = uf.id
          WHERE ${safeColumn} IS NOT NULL
            AND uf.hidden = 0
            AND (? = 1 OR (? = 0 AND uf.org_id = ?))
          LIMIT 1
        `);
        params.push(isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId);
      });

      const sql = unionQueries.join(' UNION ');

      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('DB Error in getAvailableElements:', err.message);
          return reject(err);
        }
        resolve(rows.map(r => r.col_name));
      });
    });
  }
}

module.exports = ElementModel;



// const db = require('../initialize_db');

// class ElementModel {
// // models/ElementModel.js
// // models/ElementModel.js
// static async getElementCorrectedValuesDetailed(
//   correctedElementName,
//   { file_id = null, start_date = null, end_date = null } = {}
// ) {
//   return new Promise((resolve, reject) => {
//     const safeColumn = `"${correctedElementName}"`;
//     const whereClauses = [
//       `sd."Solution Label" LIKE 'MCS%'`,
//       `${safeColumn} IS NOT NULL`,
//       `uf.hidden = 0`
//     ];
//     const params = [];

//     // apply file filter if present
//     if (file_id) {
//       whereClauses.push(`uf.id = ?`);
//       params.push(file_id);

//     // otherwise apply date range if present
//     } else if (start_date && end_date) {
//       // strip time portion if needed (ensure YYYY-MM-DD)
//       const sd = start_date.slice(0, 10);
//       const ed = end_date.slice(0, 10);
//       whereClauses.push(`DATE(uf.uploaded_at) BETWEEN DATE(?) AND DATE(?)`);
//       params.push(sd, ed);
//     }

//     const sql = `
//       SELECT
//         sd."Solution Label" AS sample_name,
//         sd.id               AS sample_id,
//         uf.id               AS file_id,
//         uf.type,
//         ${safeColumn}       AS value
//       FROM sample_data sd
//       JOIN sample_id_X_file_id sx ON sd.id = sx.sample_id
//       JOIN uploaded_files    uf   ON sx.file_id = uf.id
//       WHERE ${whereClauses.join(' AND ')}
//       ORDER BY sd."Solution Label" ASC
//     `;

//     db.all(sql, params, (err, rows) => {
//       if (err) {
//         console.error('DB Error in getElementCorrectedValuesDetailed:', err.message);
//         return reject(err);
//       }
//       resolve(rows);
//     });
//   });
// }

// }

// module.exports = ElementModel;
