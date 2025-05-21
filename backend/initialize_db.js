const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'files.db');

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
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  // Insert hardcoded user if users table is empty
  db.get(`SELECT COUNT(*) AS count FROM users`, (err, row) => {
    if (err) {
      console.error('Error checking users table:', err.message);
    } else if (row.count === 0) {
      const stmt = db.prepare(`INSERT INTO users (email, password) VALUES (?, ?)`);
      stmt.run('user1@gmail.com', 'password1', (err) => {
        if (err) {
          console.error('Error inserting default user:', err.message);
        } else {
          console.log('Inserted default user.');
        }
      });
      stmt.finalize();
    }
  });
});

module.exports = db;
