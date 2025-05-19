const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('../database');

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

        console.log("Sanitized headers:", sanitizedHeaders);

        // --- END HEADER SANITIZATION ---

        const createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (${sanitizedHeaders.map(h => `"${h}" TEXT`).join(', ')})`;

        db.run(createTableSQL, (err) => {
          if (err) {
            console.error('Create table error:', err);
            return reject(err);
          }

          const insertSQL = `INSERT INTO "${tableName}" (${sanitizedHeaders.map(h => `"${h}"`).join(', ')}) VALUES (${sanitizedHeaders.map(() => '?').join(', ')})`;

          const stmt = db.prepare(insertSQL);
          rows.forEach(row => {
            // Map the original headers to sanitized headers to fetch correct values
            const values = sanitizedHeaders.map((sanitizedHeader, i) => {
              const originalHeader = headers[i];
              return row[originalHeader];
            });
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
