const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 5000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Setup SQLite database
const db = new sqlite3.Database('./files.db', (err) => {
  if (err) console.error('DB Connection error:', err.message);
  else console.log('Connected to SQLite database.');
});

// Create table if not exists
db.run(
  `CREATE TABLE IF NOT EXISTS uploaded_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
);

// Upload endpoint
app.post('/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Insert file info into DB
  const sql = `INSERT INTO uploaded_files (filename, stored_name) VALUES (?, ?)`;
db.run(sql, [req.file.originalname, req.file.filename], function (err) {
  if (err) {
    console.error('DB Insert Error:', err.message); // <== This must be there
    return res.status(500).json({ error: 'Database error' });
  }

    res.json({
      id: this.lastID,
      filename: req.file.originalname,
      storedName: req.file.filename,
      message: 'File uploaded and saved to DB successfully',
    });
  });
});

// Endpoint to get all uploaded files from DB
app.get('/uploaded-files', (req, res) => {
  db.all('SELECT id, filename, stored_name, uploaded_at FROM uploaded_files ORDER BY uploaded_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
