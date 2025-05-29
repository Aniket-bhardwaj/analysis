const fs = require('fs');
const csv = require('csv-parser');
const {OcleanedHeaders} = require('../array'); 
// Parse and return trimmed headers and rows
async function cleanCSV(filepath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = null;

    fs.createReadStream(filepath)
      .pipe(csv())
      .on('headers', (rawHeaders) => {
        headers = rawHeaders.map(h =>
          h.trim().replace(/^"|"$/g, '')
        );
      })
      .on('data', (data) => {
        const cleanedRow = {};
        Object.entries(data).forEach(([key, value]) => {
          const cleanKey = key.trim().replace(/^"|"$/g, '');
          cleanedRow[cleanKey] = value;
        });
        rows.push(cleanedRow);
      })
      .on('end', () => {
        const cleanedHeaders = headers;
        const cleanedRows = rows;
        resolve({ headers: cleanedHeaders, rows: cleanedRows});
      })
      .on('error', (err) => reject(err));
  });
}
//to check if column names of uploaded files are exactly what they should be
function colCheck(headers) {
  headers = headers || [];

  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  const normalizedExpected = OcleanedHeaders.map(h => h.trim().toLowerCase());

  const missing = OcleanedHeaders.filter(
    col => !normalizedHeaders.includes(col.trim().toLowerCase())
  );
  const extra = headers.filter(
    col => !normalizedExpected.includes(col.trim().toLowerCase())
  );

  const isValid = missing.length === 0 && extra.length === 0;

  return {
    valid: isValid,
    missing,
    extra
  };
}
// Since we are adding _corrected columns, this function add cells and expand the rows
function completeRows(rows, headers, cleanedHeaders) {
  return rows.map(row => {
    const newRow = {};
    let cleanedIndex = 0;

    headers.forEach((origHeader, i) => {
      const baseCol = cleanedHeaders[cleanedIndex++];
      const val = row[origHeader];
      newRow[baseCol] = isNaN(val) ? val : parseFloat(val);

      if (baseCol.match(/nm\s*ppm$/i)) {
        const correctedCol = cleanedHeaders[cleanedIndex++];
        newRow[correctedCol] = null;
      }
    });

    return newRow;
  });
}

module.exports = { completeRows,cleanCSV,colCheck };
