const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const {completeHeaders} = require('./colHeaders'); 


const dbPath = path.resolve(__dirname, 'database.sqlite');

// Connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite connection error:', err.message);
  } else {
    console.log('Connected to SQLite database!');
  }
});

// Create tables
db.serialize(() => {
  // Create uploaded_files table
  db.run(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      hidden INTEGER DEFAULT 0
    )
  `);
  // create Sample_data , qc_data , sample_file_mapping tables


const colsDef = completeHeaders.map(col => {
  if (col === 'Solution Label') {
    return `"${col}" TEXT UNIQUE`;  // add UNIQUE constraint
  } else {
    return `"${col}" TEXT`;
  }
}).join(', ');

db.run(`CREATE TABLE IF NOT EXISTS Sample_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ${colsDef}
)`);

db.run(`CREATE TABLE IF NOT EXISTS sample_file_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "Solution Label" TEXT NOT NULL,
  file_id INTEGER NOT NULL,
  FOREIGN KEY ("Solution Label") REFERENCES Sample_data("Solution Label") ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
)`);
db.run(`CREATE TABLE IF NOT EXISTS qc_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    ${colsDef},
    FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
)`);


  //create users table

db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

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
