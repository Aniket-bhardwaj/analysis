const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

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
