const fs = require('fs');
const csv = require('csv-parser');

const sanitizeHeaders = (headers) => {
  const seen = new Set();
  return headers.map((h, i) => {
    if (h.trim().toLowerCase().includes('solution') && h.trim().toLowerCase().includes('label')) {
      seen.add(h.trim());
      return h.trim(); // Preserve exact 'Solution Label'
    }

    let colName = h.trim() || `col_${i + 1}`;
    let uniqueName = colName;
    let counter = 1;
    while (seen.has(uniqueName)) {
      uniqueName = `${colName}_${counter++}`;
    }
    seen.add(uniqueName);
    return uniqueName;
  });
};

const parseAndCleanCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error('File not found'));
    }

    const headers = [];
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headerList) => {
        headers.push(...headerList);
      })
      .on('data', (data) => {
        rows.push(data);
      })
      .on('end', () => {
        const cleanedHeaders = sanitizeHeaders(headers);
        const cleanedRows = rows.map(row => {
          const newRow = {};
          headers.forEach((origHeader, i) => {
            newRow[cleanedHeaders[i]] = row[origHeader];
          });
          return newRow;
        });

        resolve({ headers: cleanedHeaders, rows: cleanedRows });
      })
      .on('error', (err) => reject(err));
  });
};

module.exports = { parseAndCleanCSV };