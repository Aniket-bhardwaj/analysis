
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

exports.fetchGraphDataByDateRange = (startDate, endDate, solutionLabel = null) => {
  return new Promise((resolve, reject) => {
    const start = `${startDate} 00:00:00`;
    const end = `${endDate} 23:59:59`;

    const query = `
      SELECT
        q.*,
        f.type,
        f.uploaded_at
      FROM qc_data q
      JOIN uploaded_files f ON q.file_id = f.id
      WHERE f.uploaded_at BETWEEN ? AND ?
        AND f.hidden = 0
        AND q."Solution Label" ${solutionLabel ? "= ?" : "LIKE 'QC%'"}
      ORDER BY f.uploaded_at ASC
    `;

    const params = solutionLabel
      ? [start, end, solutionLabel]
      : [start, end];

    db.all(query, params, (err, rows) => {
      db.close();
      if (err) return reject(err);

      const allGraphData = {};

      for (const row of rows) {
        const fileType = row.type;
        const timestamp = fileType === 2 ? row["Acq. Date-Time"] : row["Timestamp"];
        const elementNames = ELEMENT_TABLES[fileType];

        if (!Array.isArray(elementNames)) continue;

        for (const el of elementNames) {
          const val = parseFloat(row[el]);
          if (!isNaN(val)) {
            if (!allGraphData[el]) allGraphData[el] = [];
            allGraphData[el].push({
              sample: timestamp,
              value: val,
            });
          }
        }
      }

      resolve({ success: true, graphData: allGraphData });
    });
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
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    const start = `${startDate} 00:00:00`;
    const end = `${endDate} 23:59:59`;

    db.all('SELECT * FROM sjs', (err, sjsRows) => {
      if (err) return reject(err);

      const stdRow = sjsRows.find(r => r.label === 'SJS-Std');
      const errorRow = sjsRows.find(r => r.label === 'Error');
      if (!stdRow || !errorRow) return reject(new Error('SJS data incomplete'));

      const query = `
        SELECT q.*, f.type, f.uploaded_at
        FROM qc_data q
        JOIN uploaded_files f ON q.file_id = f.id
        WHERE f.uploaded_at BETWEEN ? AND ?
          AND f.hidden = 0
          AND q."Solution Label" LIKE 'SJS-Std%'
        ORDER BY f.uploaded_at ASC
      `;

      db.all(query, [start, end], (err2, rows) => {
        db.close();
        if (err2) return reject(err2);
        if (!rows || rows.length === 0) {
          return resolve({
            success: true,
            elements: [],
            data: {},
            xLabel: 'Timestamp',
          });
        }

        const graphData = {};
        const allElements = new Set();
        let xLabel = 'Timestamp';

        rows.forEach(row => {
          const isType2 = row.type === 2;
          const sjsElements = isType2 ? OTstdcleaned : OMstdcleaned;
          const time = isType2 ? row["Acq. Date-Time"] : row["Timestamp"];
          if (isType2) xLabel = 'Acq. Date-Time';

          sjsElements.forEach(el => {
            const mid = parseFloat(stdRow[el]);
            const error = parseFloat(errorRow[el]);
            const val = parseFloat(row[el]);

            if (isNaN(mid) || isNaN(error) || isNaN(val)) return;

            const point = {
              x: time,
              y: val,
              mid,
              upper: mid + error,
              lower: mid - error
            };

            if (!graphData[el]) graphData[el] = [];
            graphData[el].push(point);
            allElements.add(el);
          });
        });

        resolve({
          success: true,
          elements: Array.from(allElements),
          data: graphData,
          xLabel
        });
      });
    });
  });
};

