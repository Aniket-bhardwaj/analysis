const fs = require('fs');
const csv = require('csv-parser');

const sanitizeHeaders = (headers) => {
  const seen = new Set();
  return headers.map((h, i) => {
    // Preserve the exact name of important columns like 'Solution Label'
    if (h.trim().toLowerCase().includes('solution') && h.trim().toLowerCase().includes('label')) {
      seen.add(h.trim());
      return h.trim(); // Keep the original format but trim whitespace
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

        // Map original rows to cleaned rows
        const cleanedRows = rows.map(row => {
          const newRow = {};
          headers.forEach((origHeader, i) => {
            newRow[cleanedHeaders[i]] = row[origHeader];
          });
          return newRow;
        });

        // Find the solution label column in our cleaned headers
        const solutionLabelCol = cleanedHeaders.find(h => 
          h.toLowerCase().includes('solution') && h.toLowerCase().includes('label'));
        
        console.log('Solution label column in CSV identified as:', solutionLabelCol);
        
        // If we found the solution label column
        if (solutionLabelCol) {
          // Find the first row index that has 'QC_MES_5 ppm' in that column (case insensitive)
          const startIndex = cleanedRows.findIndex(row => {
            const value = row[solutionLabelCol];
            return value && 
              String(value).toUpperCase().includes('QC') && 
              String(value).toUpperCase().includes('MES') && 
              String(value).toUpperCase().includes('5') &&
              String(value).toUpperCase().includes('PPM');
          });

          console.log('First QC_MES_5 ppm row found at index:', startIndex);

          if (startIndex === -1) {
            // No matching row found, return all rows in this case
            console.log('No QC_MES_5 ppm rows found, returning all rows');
            return resolve({ headers: cleanedHeaders, rows: cleanedRows });
          }

          // Slice rows from startIndex to end
          const filteredRows = cleanedRows.slice(startIndex);
          console.log(`Filtered to ${filteredRows.length} rows starting from QC_MES_5 ppm`);

          resolve({ headers: cleanedHeaders, rows: filteredRows });
        } else {
          // If no solution label column found, return all rows
          console.log('No solution label column found, returning all rows');
          resolve({ headers: cleanedHeaders, rows: cleanedRows });
        }
      })
      .on('error', (err) => reject(err));
  });
};

module.exports = { parseAndCleanCSV };