const db = require('../initialize_db');

module.exports = {

  getFileInfo(fileId) {
    return new Promise((resolve, reject) => {
      // 💡 CHANGE: Added pdf_path to the SELECT statement
      db.get(
        'SELECT filename, path, pdf_path FROM uploaded_files WHERE id = ?',
        [fileId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  async getQCDataRows(fileId, passedElements, passedElementsCorr) {
    if (!passedElements || passedElements.length === 0) return [];

    const colsQC = ['"Solution Label"', 'Timestamp', ...passedElements.map(col => `"${col}"`)].join(', ');
    const colsSJS = ['"Solution Label"', 'Timestamp', ...passedElementsCorr.map(col => `"${col}"`)].join(', ');

    // QC rows: only "QC%" Solution Label
    const sqlQC = `
      SELECT ${colsQC}
      FROM qc_data
      WHERE file_id = ?
        AND "Solution Label" LIKE 'QC%'
    `;

    // SJS + MCS rows: only "SJS%" or "MCS%"
    const sqlSJS = `
      SELECT ${colsSJS}
      FROM qc_data
      WHERE file_id = ?
        AND "Solution Label" LIKE 'SJS%'
    `;

    const rowsQC = await new Promise((resolve, reject) => {
      db.all(sqlQC, [fileId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const rowsSJS = await new Promise((resolve, reject) => {
      db.all(sqlSJS, [fileId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return rowsQC.concat(rowsSJS);
  },

  // async getQCDataRowsForFailed(fileId, failedElements, failedElementsCorr) {
  //   if (!failedElements || failedElements.length === 0) return [];

  //   const colsQC = ['"Solution Label"', 'Timestamp', ...failedElements.map(col => `"${col}"`)].join(', ');
  //   const colsSJS = ['"Solution Label"', 'Timestamp', ...failedElementsCorr.map(col => `"${col}"`)].join(', ');


  //   const sqlQC = `
  //     SELECT ${colsQC}
  //     FROM qc_data
  //     WHERE file_id = ?
  //       AND "Solution Label" LIKE 'QC%'
  //   `;

  //   const sqlSJS = `
  //     SELECT ${colsSJS}
  //     FROM qc_data
  //     WHERE file_id = ?
  //       AND "Solution Label" LIKE 'SJS%'
  //   `;

  //   const rowsQC = await new Promise((resolve, reject) => {
  //     db.all(sqlQC, [fileId], (err, rows) => {
  //       if (err) reject(err);
  //       else resolve(rows);
  //     });
  //   });

  //   const rowsSJS = await new Promise((resolve, reject) => {
  //     db.all(sqlSJS, [fileId], (err, rows) => {
  //       if (err) reject(err);
  //       else resolve(rows);
  //     });
  //   });

  //   return rowsQC.concat(rowsSJS);
  // },

  async getSampleDataRows(fileId, elementList) {
    if (!elementList || elementList.length === 0) return [];

    const cols = ['"Solution Label"', 'Timestamp', ...elementList.map(col => `"${col}"`)].join(', ');
    const sql = `
      SELECT ${cols}
      FROM sample_data
      JOIN sample_id_X_file_id ON sample_data.id = sample_id_X_file_id.sample_id
      WHERE sample_id_X_file_id.file_id = ?`;

    return new Promise((resolve, reject) => {
      db.all(sql, [fileId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getSampleIdsForFile(fileId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT sample_id FROM sample_id_X_file_id WHERE file_id = ?',
        [fileId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => r.sample_id));
        }
      );
    });
  },

  getSampleData(sampleId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT "Solution Label", Timestamp, * FROM sample_data WHERE id = ?',
        [sampleId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  async getAvg(fileId, solutionLabel, elementList) {
    if (!elementList || elementList.length === 0) return null;

    const avgColumns = elementList.map(col => `AVG("${col}") AS "${col}"`).join(', ');
    const sql = `
      SELECT ${avgColumns}
      FROM qc_data
      WHERE file_id = ? AND "Solution Label" = ?
    `;

    return new Promise((resolve, reject) => {
      db.get(sql, [fileId, solutionLabel], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};