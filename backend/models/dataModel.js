const db = require('../initialize_db');

db.run("PRAGMA foreign_keys = ON");

// Check if a sample with given Solution Label exists
async function sampleExists(solutionLabel) {
  return new Promise((resolve, reject) => {
    const query = `SELECT 1 FROM Sample_data WHERE "Solution Label" = ? LIMIT 1`;
    db.get(query, [solutionLabel], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });
}

// Insert a new sample row (only columns present in row object)
// Insert a new sample row (only columns present in row object AND in DB)
async function insertSample(row) {
  return new Promise((resolve, reject) => {
    // Fetch valid columns from Sample_data table schema
    db.all(`PRAGMA table_info(Sample_data)`, [], (err, columns) => {
      if (err) return reject(err);

      const validCols = columns.map(c => c.name);
      const rowKeys = Object.keys(row);

      // Filter row keys to only those that exist in DB
      const filteredKeys = rowKeys.filter(col => validCols.includes(col));
      if (filteredKeys.length === 0) {
        console.warn('[insertSample] No valid columns in row, skipping:', row);
        return resolve(); // Skip if nothing matches
      }

      const cols = filteredKeys.map(col => `"${col}"`).join(', ');
      const placeholders = filteredKeys.map(() => '?').join(', ');
      const values = filteredKeys.map(col => row[col]);

      const query = `INSERT INTO Sample_data (${cols}) VALUES (${placeholders})`;
      console.log('[insertSample] Final INSERT query:', query);
      console.log('[insertSample] Values:', values);

      db.run(query, values, function(err) {
        if (err) {
          console.error('[insertSample] INSERT error:', err.message);
          return reject(err);
        }
        resolve(this.lastID);
      });
    });
  });
}

// Update existing sample by Solution Label; update only columns present in row except Solution Label itself
async function updateSample(solutionLabel, row) {
  return new Promise((resolve, reject) => {
    // exclude "Solution Label" from SET clause
    const columns = Object.keys(row).filter(col => col !== 'Solution Label');
    if (columns.length === 0) return resolve(); // nothing to update

    const setClause = columns.map(col => `"${col}" = ?`).join(', ');
    const values = columns.map(col => row[col]);
    values.push(solutionLabel); // for WHERE clause

    const query = `UPDATE Sample_data SET ${setClause} WHERE "Solution Label" = ?`;

    db.run(query, values, function(err) {
      if (err) return reject(err);
      resolve(this.changes);
    });
  });
}

// Insert into mapping table: sample_file_mapping("Solution Label", file_id)
async function insertSampleFileMapping(solutionLabel, fileId) {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO sample_file_mapping ("Solution Label", file_id) VALUES (?, ?)`;
    db.run(query, [solutionLabel, fileId], function(err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
}

async function insertQCRow(row, fileId) {
  return new Promise((resolve, reject) => {
    const columns = Object.keys(row);
    const quotedColumns = ['file_id', ...columns.map(col => `"${col}"`)];
    const placeholders = Array(1 + columns.length).fill('?').join(', '); // file_id + data columns
    const sql = `INSERT INTO QC_data (${quotedColumns.join(', ')}) VALUES (${placeholders})`;
    const values = [fileId, ...columns.map(col => row[col])];

    db.run(sql, values, function (err) {
      if (err) {
        console.error('[insertQCRow] Error inserting QC row:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function getQCMESAverages(fileId) {
  try {
    // Step 1: Try both labels and use whichever is present
    const possibleLabels = ['QC MES 5 ppm', 'QC MES 50 ppb'];
    let labelFound = null;
    let sampleRow = null;

    for (const label of possibleLabels) {
      sampleRow = await new Promise((resolve, reject) => {
        db.get(
          `SELECT * FROM qc_data WHERE "Solution Label" = ? AND file_id = ? LIMIT 1`,
          [label, fileId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (sampleRow) {
        labelFound = label;
        break;
      }
    }

    if (!sampleRow) {
      throw new Error('No QC MES rows found for the given file_id.');
    }

    // Step 2: Determine element columns
    const excludeColumns = [
      'id', 'file_id', 'Solution Label', 'Timestamp', 'Sample', 'Rjct', 'Data File',
      'Acq. Date-Time', 'Type', 'Level', 'Total Dil.', 'Vial Number', 'Rack:Tube',
    ];
    const elementColumns = Object.keys(sampleRow).filter(
      col => !excludeColumns.includes(col) && sampleRow[col] !== null && sampleRow[col] !== ''
    );

    if (elementColumns.length === 0) {
      throw new Error('No element columns with valid values found.');
    }

    const avgExpressions = elementColumns
      .map(col => `AVG(CAST("${col}" AS REAL)) AS "${col}"`)
      .join(', ');

    const query = `
      SELECT ${avgExpressions}
      FROM qc_data
      WHERE "Solution Label" = ? AND file_id = ?
    `;

    const averages = await new Promise((resolve, reject) => {
      db.get(query, [labelFound, fileId], (err, result) => {
        if (err) reject(err);
        else resolve({ averages: result, usedLabel: labelFound });
      });
    });

    return averages;

  } catch (error) {
    console.error('Error in getQCMESAverages:', error.message);
    throw error;
  }
}


module.exports = {
  sampleExists,
  insertSample,
  updateSample,
  insertSampleFileMapping,
  insertQCRow,
  getQCMESAverages
};


