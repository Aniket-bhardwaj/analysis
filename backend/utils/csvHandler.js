const fs = require('fs');
const csv = require('csv-parser');

const sanitizeHeaders = (headers) => {
  const seen = new Set();
  const cleaned = [];

  headers.forEach((h, i) => {
    let colName = h.trim() || `col_${i + 1}`;

    let uniqueName = colName;
    let counter = 1;
    while (seen.has(uniqueName)) {
      uniqueName = `${colName}_${counter++}`;
    }
    seen.add(uniqueName);
    cleaned.push(uniqueName);

    // Add corrected version for element columns (with "nm ppm" suffix)
    if (colName.match(/nm\s*ppm$/i)) {
      const correctedCol = `${uniqueName}_Corrected`;
      seen.add(correctedCol);
      cleaned.push(correctedCol);
    }
  });

  return cleaned;
};

function cleanRows(rows, headers, cleanedHeaders) {
  return rows.map(row => {
    const newRow = {};
    let cleanedIndex = 0;

    headers.forEach((origHeader, i) => {
      const baseCol = cleanedHeaders[cleanedIndex++];

      // parseFloat if numeric (for calculation), else keep string
      const val = row[origHeader];
      newRow[baseCol] = isNaN(val) ? val : parseFloat(val);

      if (baseCol.match(/nm\s*ppm$/i)) {
        const correctedCol = cleanedHeaders[cleanedIndex++];
        newRow[correctedCol] = null; // initially null, to be updated after correction
      }
    });

    return newRow;
  });
}

async function parseAndCleanCSV(filepath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = null;

    fs.createReadStream(filepath)
      .pipe(csv())
      .on('headers', (rawHeaders) => {
        headers = rawHeaders.map(h => h.trim());
      })
      .on('data', (data) => rows.push(data))
      .on('end', () => {
        const cleanedHeaders = sanitizeHeaders(headers);

        const cleanedRows = cleanRows(rows, headers, cleanedHeaders);

        // Extract nm ppm and corrected columns lists for controller
        const nmPpmColumns = [];
        const correctedColumns = [];

        cleanedHeaders.forEach((col) => {
          if (col.match(/nm\s*ppm$/i)) nmPpmColumns.push(col);
          else if (col.match(/_Corrected$/)) correctedColumns.push(col);
        });

        resolve({ headers: cleanedHeaders, rows: cleanedRows, nmPpmColumns, correctedColumns });
      })
      .on('error', (err) => reject(err));
  });
}

module.exports = { parseAndCleanCSV };