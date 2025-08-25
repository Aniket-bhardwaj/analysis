
const db = require('../initialize_db');


class TableModel {
  static async getMiniTableRaw(fileId, solutionLabel, element) {
  return new Promise((resolve, reject) => {

    const cleanElement = element.replace(/"/g, '""'); // prevent SQL injection via column name
    const query = `
      SELECT "${cleanElement}" AS value, 
      COALESCE("Timestamp", "Acq. Date-Time") AS timestamp
      FROM qc_data
      WHERE file_id = ? AND "Solution Label" = ?
      ORDER BY timestamp ASC
    `;

    db.all(query, [fileId, solutionLabel], (err, rows) => {
      if (err) {
        console.error('❌ getMiniTableRaw DB error:', err);
        return reject(err);
      }
      // console.log("✅ Raw mini table rows:", rows);

      resolve(rows);
    });
  });
}

static async getQCDataWithDateRange(startDate, endDate, elementColumns, solutionLabel = null) {
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
    ? [startDate, endDate, solutionLabel, startDate, endDate, solutionLabel]
    : [startDate, endDate, startDate, endDate];

  return new Promise((resolve, reject) => {
    // Add this before db.all(query, ...) to log which files are included
// const debugParams = solutionLabel
//   ? [startDate, endDate, solutionLabel]
//   : [startDate, endDate];

// const debugQuery = `
//   SELECT f.id AS file_id, f.type, f.uploaded_at, q."Solution Label"
//   FROM qc_data q
//   JOIN uploaded_files f ON q.file_id = f.id
//   WHERE f.uploaded_at >= ? AND f.uploaded_at <= ?
//     AND f.hidden = 0
//     AND q."Solution Label" ${solutionLabel ? "= ?" : "LIKE 'QC%'"}
// `;

// db.all(debugQuery, debugParams, (debugErr, debugRows) => {
//   if (debugErr) {
//     console.error("⚠️ Debug query failed:", debugErr);
//   } else {
//     debugRows.forEach(r =>
//       console.log(`- File ID: ${r.file_id}, Type: ${r.type}, Label: ${r["Solution Label"]}`)
//     );
//   }
// });

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error("❌ Error in getQCDataWithDateRange (avg+rsd):", err);
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






  
  static getAvgAndRsdRows(fileId, solutionLabel, elementColumns) {
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
        FROM qc_data
        WHERE "Solution Label" = ? AND file_id = ?`;

      const rsdQuery = `
        SELECT ${rsdExprs}
        FROM qc_data
        WHERE "Solution Label" = ? AND file_id = ?`;

      const params = [solutionLabel, fileId];

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
}
module.exports = TableModel;