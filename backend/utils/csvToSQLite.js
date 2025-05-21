const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('../initialize_db');

const sanitizeTableName = (name) => {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
};

const csvToSQLite = (filePath, originalName, timestamp) => {
  console.log('csvToSQLite called with:', filePath); 
  return new Promise((resolve, reject) => {
    console.log('Starting CSV to SQLite conversion for:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('CSV file not found:', filePath);
      return reject(new Error('File not found'));
    }

    const headers = [];
    const rows = [];
    const baseName = path.parse(originalName).name;
    const tableName = sanitizeTableName(`${baseName}_${timestamp}`);

    console.log("Creating table:", tableName);

    const readStream = fs.createReadStream(filePath);

    readStream.on('error', (err) => {
      console.error('Read stream error:', err);
      reject(err);
    });

    readStream
      .pipe(csv())
      .on('headers', (headerList) => {
        headers.push(...headerList);
      })
      .on('data', (data) => {
        rows.push(data);
      })
      .on('end', () => {
        console.log("Parsed headers:", headers);
        console.log("Number of rows:", rows.length);

        // --- START HEADER SANITIZATION ---

        // Trim headers and replace empty ones with default names like col_1, col_2...
        let sanitizedHeaders = headers.map((h, i) => {
          let colName = h.trim();
          if (!colName) colName = `col_${i + 1}`;
          return colName;
        });

        // Make headers unique by appending _1, _2 ... if duplicates exist
        const seen = new Set();
        sanitizedHeaders = sanitizedHeaders.map(h => {
          let uniqueName = h;
          let counter = 1;
          while (seen.has(uniqueName)) {
            uniqueName = `${h}_${counter++}`;
          }
          seen.add(uniqueName);
          return uniqueName;
        });

        // Add Run Number column to sanitized headers if it doesn't exist
        if (!sanitizedHeaders.includes('Run Number')) {
          sanitizedHeaders.unshift('Run Number');
        }

        console.log("Sanitized headers with Run Number:", sanitizedHeaders);

        // --- END HEADER SANITIZATION ---

        // Log original column data for debug
        console.log("Original data sample (first row):", rows[0]);
        console.log("Original headers:", headers);

        // --- START RUN NUMBER PROCESSING ---
        
        // Find the Solution Label column
        const solutionLabelColumn = headers.find(h => 
          h === 'Solution Label' || h.includes('Solution') || h.includes('Label'));
        
        console.log("Solution Label column found:", solutionLabelColumn);
        
        // Process rows to add Run Number
        let processedRows = [...rows];
        
        // Filter rows starting from QC_MES_5 ppm if that solution exists
        if (solutionLabelColumn) {
          const qcRowIndex = processedRows.findIndex(row => 
            row[solutionLabelColumn] === 'QC_MES_5 ppm');
          
          if (qcRowIndex !== -1) {
            processedRows = processedRows.slice(qcRowIndex);
            console.log(`Found QC_MES_5 ppm at row ${qcRowIndex}, filtered down to ${processedRows.length} rows`);
          }
        }
        
        // Assign run numbers
        let runNumber = 1; // Start with 1 instead of 0
        const processedRowsWithRunNumbers = [];
        
        for (const row of processedRows) {
          // Check if this is a new run (QC_MES_5 ppm)
          if (solutionLabelColumn && row[solutionLabelColumn] === 'QC_MES_5 ppm' && processedRowsWithRunNumbers.length > 0) {
            runNumber += 1;
            console.log(`Incrementing run number to ${runNumber} at row with Solution Label: ${row[solutionLabelColumn]}`);
          }
          
          // Add the run number to this row
          const newRow = { 'Run Number': runNumber.toString(), ...row };
          processedRowsWithRunNumbers.push(newRow);
        }
        
        // Replace processed rows with the new array that has run numbers
        processedRows = processedRowsWithRunNumbers;
        
        console.log(`Assigned ${runNumber} different run numbers. First few rows:`, 
          processedRows.slice(0, 3).map(row => ({ 'Run Number': row['Run Number'], 'Solution Label': row[solutionLabelColumn] })));
        
        // --- END RUN NUMBER PROCESSING ---

        // Create a map of original header positions
        const headerPositionMap = {};
        headers.forEach((header, index) => {
          headerPositionMap[header] = index;
        });

        const createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (${sanitizedHeaders.map(h => `"${h}" TEXT`).join(', ')})`;

        db.run(createTableSQL, (err) => {
          if (err) {
            console.error('Create table error:', err);
            return reject(err);
          }

          const insertSQL = `INSERT INTO "${tableName}" (${sanitizedHeaders.map(h => `"${h}"`).join(', ')}) VALUES (${sanitizedHeaders.map(() => '?').join(', ')})`;

          const stmt = db.prepare(insertSQL);
          processedRows.forEach(row => {
            // Map the sanitized headers to values
            const values = sanitizedHeaders.map(sanitizedHeader => {
              // Handle the Run Number column we added
              if (sanitizedHeader === 'Run Number') {
                return row['Run Number'];
              }
              
              // For all other columns, try to find the matching original header
              for (const origHeader of Object.keys(row)) {
                // Skip the Run Number we added
                if (origHeader === 'Run Number') continue;
                
                // Direct match
                if (origHeader === sanitizedHeader) {
                  return row[origHeader];
                }
                
                // Sanitized match (replace spaces and special chars with underscores)
                const sanitizedOrigHeader = origHeader.trim().replace(/[^a-zA-Z0-9_]/g, '_');
                if (sanitizedOrigHeader === sanitizedHeader) {
                  return row[origHeader];
                }
                
                // Handle case where header was renamed due to duplicates
                if (sanitizedHeader.startsWith(sanitizedOrigHeader + '_')) {
                  return row[origHeader];
                }
              }
              
              // If we get here, there's no matching value in the original row
              console.warn(`No matching value found for column "${sanitizedHeader}"`);
              return null;
            });

            // Debug log for values on the first few rows
            if (processedRows.indexOf(row) < 3) {
              console.log(`Row ${processedRows.indexOf(row)} values:`, values);
            }
            
            stmt.run(values);
          });
          
          stmt.finalize((finalizeErr) => {
            if (finalizeErr) {
              console.error('Finalize statement error:', finalizeErr);
              return reject(finalizeErr);
            }
            console.log('CSV to SQLite conversion done.');
            resolve(tableName);
          });
        });
      })
      .on('error', (err) => {
        console.error('CSV parse error:', err);
        reject(err);
      });
  });
};

module.exports = csvToSQLite;