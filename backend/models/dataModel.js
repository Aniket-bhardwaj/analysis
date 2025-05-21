const db = require('../initialize_db');

const tableName = 'data';

async function createTable(columns) {
  const colsDef = columns.map(col => `"${col}" TEXT`).join(', ');
  const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_number INTEGER,
    file_id INTEGER,
    ${colsDef}
  )`;

  return new Promise((resolve, reject) => {
    db.run(sql, (err) => (err ? reject(err) : resolve()));
  });
}

async function getExistingColumns() {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) return reject(err);
      const colNames = rows.map(r => r.name);
      resolve(colNames);
    });
  });
}

async function addMissingColumns(columns) {
  const existingCols = await getExistingColumns();
  const missingCols = columns.filter(col => !existingCols.includes(col));
  for (const col of missingCols) {
    const sql = `ALTER TABLE ${tableName} ADD COLUMN "${col}" TEXT`;
    await new Promise((resolve, reject) => {
      db.run(sql, (err) => (err ? reject(err) : resolve()));
    });
  }
}

async function ensureTableWithColumns(columns) {
  if (!Array.isArray(columns)) {
    throw new Error('ensureTableWithColumns expects an array of columns');
  }

  await createTable(columns);
  await addMissingColumns(columns);
}

async function getMaxRunNumber() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) AS count, MAX(run_number) AS maxRun FROM ${tableName}`, (err, row) => {
      if (err) return reject(err);
      if (row.count === 0) return resolve(0); // No rows in the table
      const maxRun = row.maxRun !== null ? parseInt(row.maxRun) : 0;
      resolve(maxRun);
    });
  });
}

async function insertRowsWithRunNumbers(rows, headers, fileId, solutionLabelColumn) {
  if (!rows || rows.length === 0) return;

  // Debug logging to help track the issue
  console.log(`Starting insertRowsWithRunNumbers with ${rows.length} rows`);
  console.log(`Solution label column provided: "${solutionLabelColumn}"`);
  
  // Check if the column exists in the first row
  if (rows[0] && solutionLabelColumn) {
    console.log(`First row solution label value: "${rows[0][solutionLabelColumn]}"`);
    console.log('Available columns in first row:', Object.keys(rows[0]));
  }

  let currentRun = await getMaxRunNumber();
  console.log(`Current max run number from DB: ${currentRun}`);
  
  let seenFirstQCMES = false;

  const insertColumns = ['run_number', 'file_id', ...headers];
  const placeholders = insertColumns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${tableName} (${insertColumns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

  // First scan through to create run numbers
  for (let i = 0; i < rows.length; i++) {
    // Skip if no solution label column defined
    if (!solutionLabelColumn) continue;
    
    const row = rows[i];
    const labelRaw = row[solutionLabelColumn];
    
    // Skip if value is undefined or null
    if (labelRaw === undefined || labelRaw === null) continue;
    
    const label = String(labelRaw).trim();
    
    // Debug this specific row's label
    console.log(`Row ${i} label: "${label}"`);
    
    // Check various formats of QC_MES_5 ppm
    if (label.toUpperCase().includes('QC') && 
        label.toUpperCase().includes('MES') && 
        label.toUpperCase().includes('5') &&
        label.toUpperCase().includes('PPM')) {
      
      console.log(`Found QC MES marker at row ${i}: "${label}"`);
      
      if (!seenFirstQCMES) {
        seenFirstQCMES = true;
        currentRun += 1; // Start from 1
        console.log(`First QC_MES encountered, run number now: ${currentRun}`);
      } else {
        currentRun += 1; 
        console.log(`Another QC_MES encountered, run number now: ${currentRun}`);
      }
    }
    
    // Store the run number directly in the row object for later use
    row._runNumber = currentRun;
  }

  return new Promise((resolve, reject) => {
    const stmt = db.prepare(sql, (err) => {
      if (err) return reject(err);

      try {
        db.serialize(() => {
          // Use a transaction for faster bulk insert
          db.run('BEGIN TRANSACTION');
          
          for (const row of rows) {
            const runNumber = row._runNumber || 0; // Use calculated run number or default to 0
            
            const values = [runNumber, fileId];
            for (const col of headers) {
              values.push(row[col] !== undefined ? row[col] : null);
            }

            stmt.run(values, (err) => {
              if (err) {
                console.error('Insert error:', err);
                // Don't reject here to avoid transaction issues
              }
            });
          }
          
          // Commit all inserts
          db.run('COMMIT', (err) => {
            if (err) {
              console.error('Commit error:', err);
              reject(err);
              return;
            }
            
            stmt.finalize((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });
      } catch (e) {
        console.error('Transaction error:', e);
        // Try to rollback on error
        db.run('ROLLBACK');
        reject(e);
      }
    });
  });
}

// Optional helper function to get the data for a specific run
async function getRunData(runNumber) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM ${tableName} WHERE run_number = ? ORDER BY id`;
    db.all(sql, [runNumber], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Optional helper function to get all unique run numbers
async function getAllRunNumbers() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT DISTINCT run_number FROM ${tableName} ORDER BY run_number`;
    db.all(sql, (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => r.run_number));
    });
  });
}

module.exports = {
  ensureTableWithColumns,
  insertRowsWithRunNumbers,
  getRunData,
  getAllRunNumbers
};