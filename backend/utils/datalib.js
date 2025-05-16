import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sqlite3Pkg from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize app and database
const app = express();
const PORT = 5000;

// Use SQLite verbose for better error messages
const sqlite3 = sqlite3Pkg.verbose();

// Delete the database file if it exists to recreate schema
// CAUTION: This will delete all existing data - remove this in production!
if (fs.existsSync('./files.db')) {
  try {
    fs.unlinkSync('./files.db');
    console.log('Recreating database file');
  } catch (err) {
    console.error('Failed to delete database file:', err);
  }
}

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Add timestamp to prevent filename collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

// Configure multer upload
const upload = multer({ 
  storage,
  // Add file size limits
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add this for form data parsing
app.use('/uploads', express.static(uploadDir));

// Setup SQLite database with better error handling
const db = new sqlite3.Database('./files.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1); // Exit if database connection fails
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `, (err) => {
    if (err) console.error('Error creating users table:', err.message);
  });

  // Create uploaded_files table
  db.run(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      filename TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating uploaded_files table:', err.message);
  });
}

// File upload endpoint with better error handling
app.post('/upload-csv', (req, res) => {
  // Run the upload middleware
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: 'File upload failed: ' + err.message });
    }
    
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Get credentials from request body
    const { email, password } = req.body;
    
    // Validate credentials
    if (!email || !password) {
      // Delete the uploaded file to avoid orphaned files
      try {
        fs.unlinkSync(path.join(uploadDir, req.file.filename));
      } catch (error) {
        console.error('Error deleting file:', error);
      }
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find or create user with better error handling
    const findUserSql = `SELECT id FROM users WHERE email = ?`;
    db.get(findUserSql, [email], (err, user) => {
      if (err) {
        console.error('Database error during user lookup:', err);
        return res.status(500).json({ error: 'Database error during user lookup' });
      }

      const handleUpload = (userId) => {
        const sql = `INSERT INTO uploaded_files (user_id, filename, stored_name) VALUES (?, ?, ?)`;
        db.run(sql, [userId, req.file.originalname, req.file.filename], function(err) {
          if (err) {
            console.error('Database error during file record insertion:', err);
            return res.status(500).json({ error: 'Failed to save file information' });
          }

          res.json({
            id: this.lastID,
            filename: req.file.originalname,
            storedName: req.file.filename,
            message: 'File uploaded successfully'
          });
        });
      };

      if (user) {
        // For existing user, verify password
        db.get(`SELECT id FROM users WHERE email = ? AND password = ?`, [email, password], (err, verifiedUser) => {
          if (err || !verifiedUser) {
            return res.status(401).json({ error: 'Invalid credentials' });
          }
          handleUpload(verifiedUser.id);
        });
      } else {
        // Create new user
        db.run(`INSERT INTO users (email, password) VALUES (?, ?)`, [email, password], function(err) {
          if (err) {
            console.error('Database error during user creation:', err);
            return res.status(500).json({ error: 'Failed to create user account' });
          }
          handleUpload(this.lastID);
        });
      }
    });
  });
});

// Endpoint to get all uploaded files from DB
app.get('/uploaded-files', (req, res) => {
  const sql = `
    SELECT 
      uploaded_files.id,
      uploaded_files.filename,
      uploaded_files.stored_name,
      uploaded_files.uploaded_at,
      users.email
    FROM uploaded_files
    LEFT JOIN users ON uploaded_files.user_id = users.id
    ORDER BY uploaded_at DESC
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error('Database error during file listing:', err);
      return res.status(500).json({ error: 'Failed to retrieve files' });
    }
    res.json(rows);
  });
});

app.delete('/delete-file/:id', (req, res) => {
  const fileId = req.params.id;

  db.get('SELECT stored_name FROM uploaded_files WHERE id = ?', [fileId], (err, row) => {
    if (err) {
      console.error('Database error during file lookup:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(uploadDir, row.stored_name);
    
    // Delete the file from disk
    fs.unlink(filePath, (err) => {
      if (err) {
        console.warn('File not found on disk:', err.message);
        // Continue with DB deletion even if file doesn't exist on disk
      }

      // Delete from database
      db.run('DELETE FROM uploaded_files WHERE id = ?', [fileId], function(err) {
        if (err) {
          console.error('Database error during file deletion:', err);
          return res.status(500).json({ error: 'Failed to delete from database' });
        }
        res.json({ message: 'File deleted successfully' });
      });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Server error occurred' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});