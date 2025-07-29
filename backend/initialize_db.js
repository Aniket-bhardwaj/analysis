const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { completeHeaders, qcHeaders, rest_dataHeaders, OTstdcleaned, OMstdcleaned } = require('./colHeaders');
const { Tval, Terr, Merr, Mval } = require('./Oheaders');

const dbPath = path.resolve(__dirname, 'database.sqlite');

// Connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite connection error:', err.message);
  } else {
    console.log('Connected to SQLite database!');
  }
});

// Setup database schema
db.serialize(() => {
  // Table: uploaded_files
  // Note: Removed trailing comma after 'hidden INTEGER DEFAULT 0'
  db.run(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      pdfname TEXT NOT NULL,
      pdf_path TEXT NOT NULL,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      type INTEGER NOT NULL,
      hidden INTEGER DEFAULT 0
    )
  `);

  // Table: sample_data
  const colsDef = completeHeaders.map(col => {
    return col === 'Solution Label' ? `"${col}" TEXT UNIQUE` : `"${col}" TEXT`;
  }).join(', ');

  db.run(`
    CREATE TABLE IF NOT EXISTS sample_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ${colsDef}
    )
  `);

  // Table: sample_id_X_file_id (mapping table)
  db.run(`
    CREATE TABLE IF NOT EXISTS sample_id_X_file_id (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      FOREIGN KEY (sample_id) REFERENCES sample_data(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )
  `);

  // Table: qc_data
  const colsDef2 = qcHeaders.map(col => `"${col}" TEXT`).join(', ');
  db.run(`
    CREATE TABLE IF NOT EXISTS qc_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      ${colsDef2},
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )
  `);

  // Table: rest_data
  const colsDef3 = rest_dataHeaders.map(col => `"${col}" TEXT`).join(', ');
  db.run(`
  CREATE TABLE IF NOT EXISTS rest_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ${colsDef3}
  )
  `);

  // Merge trace + major element names
  const allCols = [...OTstdcleaned, ...OMstdcleaned];
  const columnDefs = allCols.map(col => `"${col}" TEXT`).join(', ');

  // Create table 'sjs'
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS sjs (
      id INTEGER PRIMARY KEY,
      label TEXT NOT NULL,
      ${columnDefs}
    );
  `;

  db.run(createTableSQL, (err) => {
    if (err) return console.error('❌ Error creating sjs table:', err);
    console.log('✅ sjs table created.');

    // Prepare insert query with 81 placeholders (1 id + 1 label + 61 + 18 = 81)
    const placeholders = Array(allCols.length + 2).fill('?').join(', ');
    const insertSQL = `INSERT OR IGNORE INTO sjs VALUES (${placeholders})`;

    // Build the rows
    const row1 = [1, 'SJS-Std', ...Tval, ...Mval];
    const row2 = [2, 'Error', ...Terr, ...Merr];

    // Insert both rows
    db.run(insertSQL, row1, (err) => {
      if (err) {
          console.error('❌ Error inserting Row 1 (SJS-Std):', err.message);
      } else if (this.changes > 0) {
          console.log('✅ Row 1 (SJS-Std) inserted');
      }
    });

    db.run(insertSQL, row2, (err) => {
        if (err) {
            console.error('❌ Error inserting Row 2 (Error):', err.message);
        } else if (this.changes > 0) {
            console.log('✅ Row 2 (Error) inserted');
        }
    });
  });


  // Table: users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default user if not already present
  const email = 'user2@gmail.com';
  const plainPassword = 'password2';

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
    if (err) {
        return console.error('Error checking for user:', err.message);
    }
    if (!row) {
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      db.run(`INSERT INTO users (email, password) VALUES (?, ?)`, [email, hashedPassword], (err) => {
        if (err) {
          console.error('Insert error:', err.message);
        } else {
          console.log('Inserted default user with hashed password');
        }
      });
    } else {
      console.log('User already exists');
    }
  });
});

module.exports = db;
