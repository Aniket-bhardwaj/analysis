const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const { completeHeaders, qcHeaders,rest_dataHeaders , OTstdcleaned} = require('./colHeaders');
const {Tval ,Terr} = require('./Oheaders');

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
  db.run(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
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

    // Table: rest_data_table
  const colsDef3 = rest_dataHeaders.map(col => `"${col}" TEXT`).join(', ');
  db.run(`
  CREATE TABLE IF NOT EXISTS rest_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ${colsDef3}
  )
  `);
  ////////////////////////////////////////////////////////////////////////
  const colsDef4 = OTstdcleaned.map(col => `"${col}" TEXT`).join(', ');
  db.run(`
  CREATE TABLE IF NOT EXISTS t_sjs (
    id INTEGER NOT NULL,
    label TEXT NOT NULL,
    ${colsDef4}
  )
  `);
  const sql = `INSERT INTO t_sjs VALUES (${Array(63).fill('?').join(', ')})`;

const row1 = [1, 'SJS-Std', ...Tval];
const row2 = [2, 'Error', ...Terr];

db.run(sql, row1, (err) => {
  if (err) console.error('Insert SJS-Std failed:', err);
  else console.log('SJS-Std inserted!');
});

db.run(sql, row2, (err) => {
  if (err) console.error('Insert Error row failed:', err);
  else console.log('Error row inserted!');
});
/////////////////////////////////////////////////////////////////////////////

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
