// =====================================================
// routes/upload.js — Stable, Production-Grade Upload Logic
// =====================================================
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../initialize_db');
const { uploadFile } = require('../controllers/uploadController');

const router = express.Router();

// -----------------------------------------------------
//  Ensure upload directories exist
// -----------------------------------------------------
const uploadsDir = path.join(__dirname, '..', 'uploads');
const pdfDir = path.join(uploadsDir, 'pdf');
const attachmentsDir = path.join(uploadsDir, 'attachments');

[uploadsDir, pdfDir, attachmentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// -----------------------------------------------------
// Multer configuration
// -----------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, pdfDir);
    else cb(null, uploadsDir);
  },
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// =====================================================
//  Admin-only CSV + PDF upload
// =====================================================
router.post(
  '/upload-files',
  (req, res, next) => {
    const isAdmin = req?.rbac?.isAdmin || req?.user?.is_admin === 1;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can upload main CSV and PDF files.' });
    }
    next();
  },
  upload.fields([
    { name: 'csvfile', maxCount: 1 },
    { name: 'pdffile', maxCount: 1 },
  ]),
  uploadFile
);

// =====================================================
//  Legacy single-file CSV upload (admin only)
// =====================================================
router.post(
  '/upload-csv',
  (req, res, next) => {
    const isAdmin = req?.rbac?.isAdmin || req?.user?.is_admin === 1;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can upload CSV files.' });
    }
    next();
  },
  upload.single('file'),
  uploadFile
);

// =====================================================
//  Attachment upload (for clients or admins)
// =====================================================
router.post('/upload-files/attachment/:parentId', upload.single('file'), async (req, res) => {
  const parentId = req.params.parentId;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded.' });

  try {
    const destPath = path.join(attachmentsDir, file.originalname);
    fs.renameSync(file.path, destPath);
    const relPath = path.relative(path.join(__dirname, '..'), destPath).replace(/\\/g, '/');

    const orgId = req?.rbac?.orgId || 1;
    const userId = req?.rbac?.userId || null;

    const insertQuery = `
      INSERT INTO uploaded_files (filename, file_path, org_id, created_by_user_id, parent_id, type)
      VALUES (?, ?, ?, ?, ?, 3)
    `;

    db.run(insertQuery, [file.originalname, relPath, orgId, userId, parentId], function (err) {
      if (err) {
        console.error(' Attachment insert error:', err.message);
        return res.status(500).json({ error: 'Failed to save attachment.' });
      }
      console.log(` Attachment saved: ${file.originalname} (ID ${this.lastID})`);
      res.json({ success: true, id: this.lastID });
    });
  } catch (err) {
    console.error(' Attachment upload error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// =====================================================
// List attachments for a parent record
// =====================================================
router.get('/attachments/:parentId', async (req, res) => {
  const { parentId } = req.params;
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    if (!parentId || isNaN(parentId)) {
      return res.status(400).json({ error: 'Invalid parentId' });
    }

    const sql = `
      SELECT id, filename, file_path, uploaded_at
      FROM uploaded_files
      WHERE parent_id = ?
        AND hidden = 0
      ORDER BY uploaded_at DESC
    `;

    db.all(sql, [parentId], (err, rows) => {
      if (err) {
        console.error('Error fetching attachments:', err.message);
        return res.status(500).json({ error: 'Database query failed' });
      }

      console.log(`[Attachments] parentId=${parentId} → ${rows.length} files`);
      res.json(rows || []);
    });
  } catch (err) {
    console.error('Error fetching attachments:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/attachments/download/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT filename, file_path FROM uploaded_files WHERE id = ? AND hidden = 0 LIMIT 1';

  db.get(sql, [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'File not found' });

    const absPath = path.join(__dirname, '..', row.file_path);
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'Missing file on disk' });

    res.download(absPath, row.filename);
  });
});

// =====================================================
// Delete Attachment (soft delete)
// =====================================================
router.delete('/attachments/delete/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'UPDATE uploaded_files SET hidden = 1 WHERE id = ?';
  db.run(sql, [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete attachment' });
    res.json({ success: true });
  });
});

// router.get('/attachments/:parentId', async (req, res) => {
//   const { parentId } = req.params;
//   try {
//     if (!parentId || isNaN(parentId)) {
//       return res.status(400).json({ error: 'Invalid parentId' });
//     }

//     const stmt = db.prepare
//       ? db.prepare(
//           'SELECT id, filename, file_path, uploaded_at FROM uploaded_files WHERE parent_id = ? AND hidden = 0'
//         )
//       : null;

//     let rows = [];
//     if (stmt) rows = stmt.all(parentId);
//     else if (db.query) {
//       const [result] = await db.query(
//         'SELECT id, filename, file_path, uploaded_at FROM uploaded_files WHERE parent_id = ? AND hidden = 0',
//         [parentId]
//       );
//       rows = result;
//     }

//     return res.status(200).json(rows || []);
//   } catch (err) {
//     console.error(' Error fetching attachments:', err.message);
//     return res.status(200).json([]); // safe fallback
//   }
// });

module.exports = router;


// // module.exports = router;
// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const db = require('../initialize_db');
// const { uploadFile } = require('../controllers/uploadController');

// const router = express.Router();

// // --- DIRECTORY SETUP ---
// const uploadsDir = path.join(__dirname, '..', 'uploads');
// const pdfDir = path.join(uploadsDir, 'pdf');
// const attachmentsDir = path.join(uploadsDir, 'attachments');
// [uploadsDir, pdfDir, attachmentsDir].forEach(dir => {
//   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
// });

// // --- MULTER CONFIG ---
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     if (file.mimetype === 'application/pdf') cb(null, pdfDir);
//     else cb(null, uploadsDir);
//   },
//   filename: (req, file, cb) => cb(null, file.originalname),
// });
// const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// // =====================================================
// //  ROUTE: Admin-only Core Upload (CSV + PDF)
// // =====================================================
// router.post(
//   '/upload-files',
//   (req, res, next) => {
//     const isAdmin = req?.rbac?.isAdmin || req?.user?.is_admin === 1;
//     if (!isAdmin) {
//       return res.status(403).json({ error: 'Only admins can upload main CSV and PDF files.' });
//     }
//     next();
//   },
//   upload.fields([
//     { name: 'csvfile', maxCount: 1 },
//     { name: 'pdffile', maxCount: 1 },
//   ]),
//   uploadFile
// );

// // =====================================================
// //  ROUTE: Legacy CSV Upload (optional, admin only)
// // =====================================================
// router.post(
//   '/upload-csv',
//   (req, res, next) => {
//     const isAdmin = req?.rbac?.isAdmin || req?.user?.is_admin === 1;
//     if (!isAdmin) {
//       return res.status(403).json({ error: 'Only admins can upload CSV files.' });
//     }
//     next();
//   },
//   upload.single('file'),
//   uploadFile
// );

// // =====================================================
// //  ROUTE: Attachments for a Specific Parent File
// // =====================================================
// router.post('/upload-files/attachment/:parentId', upload.single('file'), async (req, res) => {
//   const parentId = req.params.parentId;
//   const file = req.file;

//   if (!file) return res.status(400).json({ error: 'No file uploaded' });

//   try {
//     // Save into /uploads/attachments
//     const destPath = path.join(attachmentsDir, file.originalname);
//     fs.renameSync(file.path, destPath);
//     const relPath = path.relative(path.join(__dirname, '..'), destPath).replace(/\\/g, '/');

//     const orgId = req?.rbac?.orgId || null;
//     const userId = req?.rbac?.userId || null;

//     // Insert DB entry
//     const insertQuery = `
//       INSERT INTO uploaded_files (filename, file_path, org_id, created_by_user_id, parent_id, type)
//       VALUES (?, ?, ?, ?, ?, 2)
//     `;

//     db.run(insertQuery, [file.originalname, relPath, orgId, userId, parentId], function (err) {
//       if (err) {
//         console.error('Attachment insert error:', err);
//         return res.status(500).json({ error: 'Failed to save attachment' });
//       }
//       res.json({ success: true, id: this.lastID });
//     });
//   } catch (err) {
//     console.error('Attachment upload error:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // =====================================================
// // ROUTE: List Attachments for a Parent File
// // =====================================================
// // Clean and safe attachment listing
// router.get('/attachments/:parentId', async (req, res) => {
//   const { parentId } = req.params;
//   try {
//     if (!parentId || isNaN(parentId)) {
//       return res.status(400).json({ error: 'Invalid parentId' });
//     }

//     const stmt = db.prepare
//       ? db.prepare('SELECT id, filename FROM uploaded_files WHERE parent_id = ? AND hidden = 0')
//       : null;

//     let rows = [];
//     if (stmt) {
//       rows = stmt.all(parentId);
//     } else if (db.query) {
//       // Fallback for promise-based SQLite wrapper
//       const [result] = await db.query(
//         'SELECT id, filename FROM uploaded_files WHERE parent_id = ? AND hidden = 0',
//         [parentId]
//       );
//       rows = result;
//     }

//     return res.status(200).json(rows || []);
//   } catch (err) {
//     console.error('Error fetching attachments:', err);
//     // Return empty array instead of 500
//     return res.status(200).json([]);
//   }
// });


// module.exports = router;
