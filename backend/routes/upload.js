const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Import the file system module to create directories
// The uploadController will need to be updated to handle the new file structure.
const { uploadFile } = require('../controllers/uploadController');

const router = express.Router();

// Define base upload directory and the subdirectory for PDFs
const uploadsDir = path.join(__dirname, '..', 'uploads');
const pdfDir = path.join(uploadsDir, 'pdf');

// --- DIRECTORY CREATION ---
// Ensure the directories exist, creating them if they don't.
// This prevents errors if the folders have not been manually created.
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir);
}

// --- MULTER STORAGE CONFIGURATION ---
// This configuration now dynamically sets the destination based on file type.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check if the uploaded file is a PDF.
    if (file.mimetype === 'application/pdf') {
      // If it's a PDF, save it in the 'uploads/pdf' directory.
      cb(null, pdfDir);
    } else {
      // All other files (e.g., CSVs) go to the main 'uploads' directory.
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    // Store the file using its original name.
    cb(null, file.originalname);
  }
});

// Initialize multer with the updated storage configuration.
const upload = multer({ storage });

// --- EXISTING ROUTE (UNCHANGED) ---
// This route for single CSV uploads remains untouched for backward compatibility.
// It expects a single file in a form field named 'file'.
router.post('/upload-csv', upload.single('file'), uploadFile);


// --- NEW ROUTE for CSV + PDF ---
// This new route handles the combined upload of a CSV and a PDF file.
// It uses `upload.fields()` to accept files from specific form fields.
// The frontend will need to send the CSV as 'csvfile' and the PDF as 'pdffile'.
router.post('/upload-files',
  upload.fields([
    { name: 'csvfile', maxCount: 1 },
    { name: 'pdffile', maxCount: 1 }
  ]),
  uploadFile // Note: The 'uploadFile' controller must now handle `req.files` (an object)
             // in addition to `req.file` (a single object) for the older route.
);

module.exports = router;
