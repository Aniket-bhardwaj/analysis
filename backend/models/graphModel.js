const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');
const { MEconc, TEconc } = require('../colHeaders');

const VALID_LABELS = {
  1: 'QC MES 5 ppm',
  2: 'QC MES 50 ppb',
};

const ELEMENT_TABLES = {
  1: MEconc,
  2: TEconc,
};

exports.fetchGraphData = (fileId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    console.log('Fetching file with id:', fileId);

    db.get('SELECT type FROM uploaded_files WHERE id = ?', [fileId], (err, fileRow) => {
      if (err) return reject(err);
      if (!fileRow) return reject(new Error('File not found'));

      const fileType = fileRow.type;
      const qcLabel = VALID_LABELS[fileType];
      const elementNames = ELEMENT_TABLES[fileType];

      if (!qcLabel || !Array.isArray(elementNames) || elementNames.length === 0) {
        return reject(new Error('Invalid file type or element list'));
      }

      const timeColumn = fileType === 2 ? `"Acq. Date-Time"` : `"Timestamp"`;

      const query = `
        SELECT ${timeColumn} AS timestamp, ${elementNames.map(el => `"${el}"`).join(', ')}
        FROM qc_data
        WHERE file_id = ? AND "Solution Label" = ?
        ORDER BY ${timeColumn} ASC
      `;

      db.all(query, [fileId, qcLabel], (err, rows) => {
        db.close();
        if (err) return reject(err);

        const graphData = {};

        elementNames.forEach(element => {
          graphData[element] = rows
            .map(row => ({
              sample: row.timestamp,
              value: parseFloat(row[element])
            }))
            .filter(point => !isNaN(point.value));
        });

        resolve({
          success: true,
          graphData
        });
      });
    });
  });
};
