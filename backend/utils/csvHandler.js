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

async function parseAndCleanCSV(filepath) {
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
        const cleanedHeaders = sanitizeHeaders(headers);
        const cleanedRows = cleanRows(rows, headers, cleanedHeaders);

        const nmPpmColumns = [];
        const correctedColumns = [];

        cleanedHeaders.forEach((col) => {
          if (col.match(/nm\s*ppm$/i) && !col.includes('_Corrected')) {
            nmPpmColumns.push(col);
          } else if (col.includes('_Corrected')) {
            correctedColumns.push(col);
          }
        });

        resolve({ headers: cleanedHeaders, rows: cleanedRows, nmPpmColumns, correctedColumns });
      })
      .on('error', (err) => reject(err));
  });
}

module.exports = { parseAndCleanCSV };
