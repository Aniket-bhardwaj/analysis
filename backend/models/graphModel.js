const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');
const { MEconc, TEconc } = require('../colHeaders');
const db = require('../initialize_db');
const { OTstdcleaned, OMstdcleaned } = require('../colHeaders');


const VALID_LABELS = {
  1: 'QC MES 5 ppm',
  2: 'QC MES 50 ppb',
};

const ELEMENT_TABLES = {
  1: MEconc,
  2: TEconc,
};

exports.fetchGraphDataByFileId = (fileId) => {
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
          const points = rows.map(row => ({
            sample: row.timestamp,
            value: parseFloat(row[element])
          })).filter(point => !isNaN(point.value));

          // Only include elements that have at least one valid value
          if (points.length > 0) {
            graphData[element] = points;
          }
        });

        resolve({
          success: true,
          graphData
        });
      });
    });
  });
};

exports.fetchGraphDataByDateRange = (startDate, endDate) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);

    const start = `${startDate} 00:00:00`;
    const end = `${endDate} 23:59:59`;

    // First, fetch relevant file IDs
    db.all(
      `SELECT id, type FROM uploaded_files WHERE uploaded_at BETWEEN ? AND ? AND hidden = 0`,
      [start, end],
      (err, files) => {
        if (err) {
          db.close();
          return reject(err);
        }

        if (files.length === 0) {
          db.close();
          return resolve({ success: true, graphData: {} });
        }

        const allGraphData = {};

        let completed = 0;

        files.forEach(({ id: fileId, type }) => {
          const qcLabel = VALID_LABELS[type];
          const elementNames = ELEMENT_TABLES[type];
          const timeColumn = type === 2 ? `"Acq. Date-Time"` : `"Timestamp"`;

          if (!qcLabel || !Array.isArray(elementNames) || elementNames.length === 0) {
            completed++;
            if (completed === files.length) {
              db.close();
              resolve({ success: true, graphData: allGraphData });
            }
            return;
          }

          const query = `
            SELECT ${timeColumn} AS timestamp, ${elementNames.map(el => `"${el}"`).join(', ')}
            FROM qc_data
            WHERE file_id = ? AND "Solution Label" = ?
            ORDER BY ${timeColumn} ASC
          `;

          db.all(query, [fileId, qcLabel], (err2, rows) => {
            if (!err2 && rows) {
              elementNames.forEach(element => {
                const dataPoints = rows
                  .map(row => ({
                    sample: row.timestamp,
                    value: parseFloat(row[element]),
                  }))
                  .filter(point => !isNaN(point.value));

                  if (dataPoints.length > 0) {
                    if (!allGraphData[element]) allGraphData[element] = [];
                    allGraphData[element].push(...dataPoints);
                  }
                });
              }

            completed++;
            if (completed === files.length) {
              db.close();
              resolve({ success: true, graphData: allGraphData });
            }
          });
        });
      }
    );
  });
};


exports.fetchSJSGraphDataByFileId = (fileId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);

    db.get('SELECT type FROM uploaded_files WHERE id = ?', [fileId], (err, fileRow) => {
      if (err) return reject(err);
      if (!fileRow) return reject(new Error('File not found'));

      const fileType = fileRow.type;
      const sjsElements = fileType === 2 ? OTstdcleaned : OMstdcleaned;
      const timeColumn = fileType === 2 ? `"Acq. Date-Time"` : `"Timestamp"`;

      // Fetch SJS-Std mid and error values
      db.all('SELECT * FROM sjs', (err, sjsRows) => {
        if (err) return reject(err);

        const stdRow = sjsRows.find(r => r.label === 'SJS-Std');
        const errorRow = sjsRows.find(r => r.label === 'Error');

        if (!stdRow || !errorRow) return reject(new Error('SJS data incomplete'));

        // Query graph data from qc_data
        const query = `
  SELECT ${timeColumn} AS timestamp, ${sjsElements.map(el => `"${el}"`).join(', ')}
  FROM qc_data
  WHERE file_id = ? AND "Solution Label" LIKE 'SJS-Std%'
  ORDER BY ${timeColumn} ASC
`;


        db.all(query, [fileId], (err, rows) => {
          db.close();
          if (err) return reject(err);

          const graphData = {};

          sjsElements.forEach(el => {
            const mid = parseFloat(stdRow[el]);
            const error = parseFloat(errorRow[el]);

            if (isNaN(mid) || isNaN(error)) return;

            const elementPoints = rows.map(row => {
              const val = parseFloat(row[el]);
              return {
                x: row.timestamp,
                y: isNaN(val) ? null : val,
                mid,
                upper: mid + error,
                lower: mid - error
              };
            }).filter(p => p.y !== null);

            if (elementPoints.length > 0) {
              graphData[el] = elementPoints;
            }
          });

          resolve({
            success: true,
            elements: Object.keys(graphData),
            data: graphData,
            xLabel: 'Timestamp',
          });
        });
      });
    });
  });
};

exports.fetchSJSGraphDataByDateRange = (startDate, endDate) => {
  // console.log('[fetchSJSGraphDataByDateRange] called with:', startDate, endDate);
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    const start = `${startDate} 00:00:00`;
    const end = `${endDate} 23:59:59`;

    const getFilesQuery = `
  SELECT id, type FROM uploaded_files
  WHERE uploaded_at BETWEEN ? AND ? AND hidden = 0
  ORDER BY uploaded_at ASC
`;

    db.all(getFilesQuery, [start, end], async (err, files) => {
      if (err) return reject(err);
      if (!files || files.length === 0) return reject(new Error('No files found in date range'));

      db.all('SELECT * FROM sjs', async (err, sjsRows) => {
        if (err) return reject(err);

        const stdRow = sjsRows.find(r => r.label === 'SJS-Std');
        const errorRow = sjsRows.find(r => r.label === 'Error');
        if (!stdRow || !errorRow) return reject(new Error('SJS data incomplete'));

        const graphData = {};
        let xLabel = 'Timestamp';
        const allElements = new Set();

        const processFile = (file) => {
          return new Promise((resolveFile, rejectFile) => {
            const sjsElements = file.type === 2 ? OTstdcleaned : OMstdcleaned;
            const timeColumn = file.type === 2 ? `"Acq. Date-Time"` : `"Timestamp"`;
            if (file.type === 2) xLabel = 'Acq. Date-Time';

            const query = `
          SELECT ${timeColumn} AS timestamp, ${sjsElements.map(el => `"${el}"`).join(', ')}
          FROM qc_data
          WHERE file_id = ? AND "Solution Label" LIKE 'SJS-Std%'
          ORDER BY ${timeColumn} ASC
        `;

            db.all(query, [file.id], (err, rows) => {
              if (err) return rejectFile(err);

              sjsElements.forEach(el => {
                const mid = parseFloat(stdRow[el]);
                const error = parseFloat(errorRow[el]);
                if (isNaN(mid) || isNaN(error)) return;

                const elementPoints = rows.map(row => {
                  const val = parseFloat(row[el]);
                  return {
                    x: row.timestamp,
                    y: isNaN(val) ? null : val,
                    mid,
                    upper: mid + error,
                    lower: mid - error
                  };
                }).filter(p => p.y !== null);

                if (elementPoints.length > 0) {
                  allElements.add(el);
                  if (!graphData[el]) graphData[el] = [];
                  graphData[el].push(...elementPoints);
                }
              });

              resolveFile();
            });
          });
        };

        try {
          await Promise.all(files.map(processFile));

          console.log('Fetched files from DB:', files.length, files.map(f => ({ id: f.id, type: f.type })));
          // console.log('Returning combined SJS elements:', Array.from(allElements));
          db.close();
          resolve({
            success: true,
            elements: Array.from(allElements),
            data: graphData,
            xLabel: 'Timestamp',
          });
        } catch (e) {
          db.close();
          reject(e);
        }
      });
    }
    );
  });
};

