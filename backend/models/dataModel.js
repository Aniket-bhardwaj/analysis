const db = require('../initialize_db');

db.run("PRAGMA foreign_keys = ON");

async function insertRows(rows, headers, fileId) {
  if (!rows || rows.length === 0) return;

  const insertColumns = ['file_id', ...headers];
  const placeholders = insertColumns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${tableName} (${insertColumns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

  return new Promise((resolve, reject) => {
    const stmt = db.prepare(sql, (err) => {
      if (err) return reject(err);

      for (const row of rows) {
        const values = [fileId];
        for (const col of headers) {
          values.push(row[col] !== undefined ? row[col] : null);
        }

        stmt.run(values, (err) => {
          if (err) {
            console.error('Insert error:', err);
            // still continue to insert others
          }
        });
      }

      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

async function getColumnAveragesByLabel(columns, label, fileId) {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error('Column list must be a non-empty array');
  }

  const avgExpressions = columns
    .map(col => `AVG(CAST("${col}" AS REAL)) AS "${col}"`)
    .join(', ');

  const query = `
    SELECT ${avgExpressions}
    FROM data
    WHERE "Solution Label" = ? AND file_id = ?
  `;

  try {
    const row = await new Promise((resolve, reject) => {
      db.get(query, [label, fileId], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    return row;
  } catch (err) {
    console.error('Error in getColumnAveragesByLabel:', err.message);
    throw err;
  }
}

async function applyCorrectionFactorsToFileRows(fileId, correctionFactors, nmPpmColumns, correctedColumns) {
  if (nmPpmColumns.length !== correctedColumns.length) {
    throw new Error('nmPpmColumns and correctedColumns length mismatch');
  }

  // We need to run each update query with await to ensure DB completes updates correctly
  for (let i = 0; i < nmPpmColumns.length; i++) {
    const col = nmPpmColumns[i];
    const correctedCol = correctedColumns[i];
    const factor = correctionFactors[col];

    if (factor == null) continue; // skip if factor is null or undefined

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE data SET "${correctedCol}" = CAST("${col}" AS REAL) + (CAST("${col}" AS REAL) * ?) WHERE file_id = ?`,
        [factor, fileId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}

module.exports = {
  insertRows,
  getColumnAveragesByLabel,
  applyCorrectionFactorsToFileRows
};
