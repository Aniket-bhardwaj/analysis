const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./files.db', (err) => {
  if (err) return console.error('DB error:', err.message);

  db.run(`ALTER TABLE uploaded_files ADD COLUMN hidden INTEGER DEFAULT 0`, (err) => {
    if (err) {
      console.error('Migration error:', err.message);
    } else {
      console.log('Migration successful: "hidden" column added.');
    }
    db.close();
  });
});
