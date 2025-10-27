const db = require('../initialize_db');

class TableModel {

  // RBAC check for a single file
  static async isFileInOrg(fileId, isAdmin, orgId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 1
        FROM uploaded_files
        WHERE id = ?
          AND (
            (? = 1) OR (? = 0 AND org_id = ?)
          )
      `;
      db.get(sql, [fileId, isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId], (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      });
    });
  }

  // Mini table raw data for QC (RBAC-safe)
  static async getMiniTableRaw(fileId, solutionLabel, element, isAdmin, orgId) {
    return new Promise((resolve, reject) => {
      const cleanElement = element.replace(/"/g, '""');

      const query = `
        SELECT "${cleanElement}" AS value, 
               COALESCE("Timestamp", "Acq. Date-Time") AS timestamp
        FROM qc_data q
        JOIN uploaded_files f ON q.file_id = f.id
        WHERE q.file_id = ?
          AND q."Solution Label" = ?
          AND (
            (? = 1) OR (? = 0 AND f.org_id = ?)
          )
        ORDER BY timestamp ASC
      `;

      db.all(query, [fileId, solutionLabel, isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId], (err, rows) => {
        if (err) {
          console.error('getMiniTableRaw DB error:', err);
          return reject(err);
        }
        resolve(rows);
      });
    });
  }

  // QC data with date range (avg + rsd), RBAC-safe
  static async getQCDataWithDateRange(startDate, endDate, elementColumns, isAdmin, orgId, solutionLabel = null) {
    if (!elementColumns || elementColumns.length === 0) {
      return { avgRow: {}, rsdRow: {} };
    }

    const safeCols = elementColumns.map(col => `"${col.replace(/"/g, '""')}"`);
    startDate = `${startDate} 00:00:00`;
    endDate = `${endDate} 23:59:59`;

    const avgCols = safeCols.map(col => `AVG(${col}) AS ${col}`).join(', ');
    const rsdCols = safeCols.map(col => `
      CASE
        WHEN AVG(${col}) IS NULL THEN NULL
        WHEN AVG(${col}) = 0 THEN 0
        ELSE (SQRT(AVG(${col} * ${col}) - AVG(${col}) * AVG(${col})) / AVG(${col})) * 100
      END AS ${col}
    `).join(', ');

    const baseWhereClause = `
      f.uploaded_at >= ? AND f.uploaded_at <= ?
      AND f.hidden = 0
      AND f.type IN (1, 2)
      AND (
        (? = 1) OR (? = 0 AND f.org_id = ?)
      )
      AND q."Solution Label" ${solutionLabel ? "= ?" : "LIKE 'QC%'"}
    `;

    const query = `
      SELECT ${avgCols}
      FROM qc_data q
      JOIN uploaded_files f ON q.file_id = f.id
      WHERE ${baseWhereClause}
      UNION ALL
      SELECT ${rsdCols}
      FROM qc_data q
      JOIN uploaded_files f ON q.file_id = f.id
      WHERE ${baseWhereClause}
    `;

    const params = solutionLabel
      ? [startDate, endDate, isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId, solutionLabel,
         startDate, endDate, isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId, solutionLabel]
      : [startDate, endDate, isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId,
         startDate, endDate, isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId];

    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error("Error in getQCDataWithDateRange:", err);
          reject(err);
        } else {
          resolve({
            avgRow: rows[0] || {},
            rsdRow: rows[1] || {}
          });
        }
      });
    });
  }

  // Avg + RSD for specific file (RBAC-safe)
  static getAvgAndRsdRows(fileId, solutionLabel, elementColumns, isAdmin, orgId) {
    return new Promise(async (resolve, reject) => {
      try {
        const safeCols = elementColumns.map(c => `"${c.replace(/"/g, '""')}"`);
        const avgExprs = safeCols.map(c => `AVG(${c}) AS ${c}`).join(', ');
        const rsdExprs = safeCols.map(col => `
          CASE
            WHEN AVG(${col}) IS NULL THEN NULL
            WHEN AVG(${col}) = 0 THEN 0
            ELSE (SQRT(AVG(${col} * ${col}) - AVG(${col}) * AVG(${col})) / AVG(${col})) * 100
          END AS ${col}
        `).join(', ');

        const avgQuery = `
          SELECT ${avgExprs}
          FROM qc_data q
          JOIN uploaded_files f ON q.file_id = f.id
          WHERE q."Solution Label" = ?
            AND q.file_id = ?
            AND (
              (? = 1) OR (? = 0 AND f.org_id = ?)
            )
        `;

        const rsdQuery = `
          SELECT ${rsdExprs}
          FROM qc_data q
          JOIN uploaded_files f ON q.file_id = f.id
          WHERE q."Solution Label" = ?
            AND q.file_id = ?
            AND (
              (? = 1) OR (? = 0 AND f.org_id = ?)
            )
        `;

        const params = [solutionLabel, fileId, isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId];
        const avgRow = await new Promise((res, rej) =>
          db.get(avgQuery, params, (err, row) => (err ? rej(err) : res(row)))
        );
        const rsdRow = await new Promise((res, rej) =>
          db.get(rsdQuery, params, (err, row) => (err ? rej(err) : res(row)))
        );

        resolve({ avgRow, rsdRow });
      } catch (err) {
        reject(err);
      }
    });
  }

 static async getSJSRows(elementColumns) {
  return new Promise((resolve, reject) => {
    const columnsToSelect = elementColumns.map(col => `"${col}"`).join(', ');
    const query = `SELECT ${columnsToSelect} FROM sjs`;

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error("Error fetching SJS rows:", err);
        return reject(err);
      }
      resolve(rows); // rows[0] = SJS-Std, rows[1] = Error
    });
  });
}
static async getBHVORows(elementColumns) {
  return new Promise((resolve, reject) => {
    const columnsToSelect = elementColumns.map(col => `"${col}"`).join(', ');
    const query = `SELECT ${columnsToSelect} FROM bhvo2`;

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error("Error fetching BHVO rows:", err);
        return reject(err);
      }
      resolve(rows); // rows[0] = SJS-Std, rows[1] = Error
    });
  });
}
}

module.exports = TableModel;
