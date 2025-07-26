const path = require('path');
const fs = require('fs');
const db = require('../initialize_db');
const uploadService = require('../services/uploadService');
// fileModel might not be directly used here but is good practice to keep if service uses it
const fileModel = require('../models/fileModel'); 

/**
 * Controller to handle file upload and processing.
 * This function is designed to handle two scenarios:
 * 1. Legacy single CSV upload (`req.file`).
 * 2. New multi-file upload with CSV and PDF (`req.files`).
 */
const uploadFile = async (req, res) => {
  // --- 1. Determine which files were uploaded and set variables ---
  const isMultiUpload = !!req.files; // True if the new '/upload-files' route was used
  const csvFile = isMultiUpload ? req.files.csvfile?.[0] : req.file;
  const pdfFile = isMultiUpload ? req.files.pdffile?.[0] : null;

  // --- 2. Initial File Validation ---
  if (!csvFile) {
    // If a PDF was uploaded without a CSV, clean it up.
    if (pdfFile) {
      fs.unlink(pdfFile.path, err => {
        if (err) console.error('Failed to delete orphaned PDF file:', err);
      });
    }
    return res.status(400).json({ error: 'No CSV file uploaded.' });
  }

  // If this is a multi-upload, we must have a PDF.
  if (isMultiUpload && !pdfFile) {
    // Clean up the uploaded CSV since its companion PDF is missing.
    fs.unlink(csvFile.path, err => {
        if (err) console.error('Failed to delete CSV file due to missing PDF:', err);
    });
    return res.status(400).json({ error: 'A PDF file is required along with the CSV file.' });
  }

  // Get paths and names from the file objects provided by multer.
  const csvOriginalName = csvFile.originalname;
  const csvSavedPath = csvFile.path;
  const pdfOriginalName = pdfFile ? pdfFile.originalname : null;
  const pdfSavedPath = pdfFile ? pdfFile.path : null;

  // --- 3. Process Files within a Database Transaction ---
  db.serialize(async () => {
    try {
      db.run('BEGIN TRANSACTION');

      // --- Step A: Validate the CSV file ---
      const {
        error: validationError,
        samples,
        qc,
        csvType,
        headers
      } = await uploadService.validate(csvSavedPath, csvOriginalName);

      if (validationError) {
        throw new Error(validationError); // Centralize error handling in catch block
      }

      // --- Step B: Insert raw data and file metadata (including PDF info) ---
      // The PDF info is passed but only saved if all checks pass.
      const {
        error: insertError,
        fileId,
      } = await uploadService.insertAllData(
        csvOriginalName, 
        csvSavedPath, 
        samples, 
        qc, 
        csvType, 
        headers,
        // Pass PDF details to the service layer
        pdfOriginalName,
        pdfSavedPath
      );

      if (insertError) {
        throw new Error(insertError);
      }

      // --- Step C: Apply correction factors to sample & std data ---
      const { error: correctionError } = await uploadService.insertCorrected(fileId, csvType, headers);

      if (correctionError) {
        throw new Error(correctionError);
      }

      // --- Step D: Success! Commit changes to the database ---
      db.run('COMMIT', (err) => {
        if (err) {
            // If commit fails, we must still try to rollback and cleanup.
            throw new Error('Failed to commit transaction: ' + err.message);
        }
        res.status(200).json({
          message: 'File(s) uploaded and processed successfully',
          fileId,
        });
      });

    } catch (err) {
      // --- Centralized Error Handling and Cleanup ---
      console.error('[uploadFile] Transaction failed, rolling back. Error:', err.message);
      db.run('ROLLBACK', () => {
        // Delete the uploaded CSV file
        fs.unlink(csvSavedPath, unlinkErr => {
          if (unlinkErr) console.error('Failed to delete CSV file on error:', unlinkErr);
        });
        // If a PDF was uploaded, delete it as well
        if (pdfSavedPath) {
          fs.unlink(pdfSavedPath, unlinkErr => {
            if (unlinkErr) console.error('Failed to delete PDF file on error:', unlinkErr);
          });
        }
        // Respond with the specific error that caused the failure
        res.status(500).json({ error: err.message || 'Database or CSV processing failed' });
      });
    }
  });
};

module.exports = { uploadFile };