const path = require('path');
const fs = require('fs');
const db = require('../initialize_db');
const fileModel = require('../models/fileModel');
const dataModel = require('../models/dataModel');
const { get } = require('http');

// Same SQLite instance

const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const originalName = req.file.originalname;
  const savedFilePath = path.join('uploads', originalName);

  db.serialize(async () => {
    try {
      db.run('BEGIN TRANSACTION');

      const {
        error: validationError,
        samples,
        qc,
      } = await uploadService.validate(savedFilePath, originalName);

      if (validationError) {
        db.run('ROLLBACK', () => {
          fs.unlink(savedFilePath, err => {
            if (err) console.error('Failed to delete invalid file:', err);
          });
          return res.status(400).json({ error: validationError });
        });
        return;
      }

      const {
        error: insertError,
        fileId,
      } = await uploadService.insertAllData(originalName, savedFilePath, samples, qc);

      if (insertError) {
        db.run('ROLLBACK', () => {
          fs.unlink(savedFilePath, err => {
            if (err) console.error(`Failed to delete file after insert error (fileId: ${fileId}):`, err);
          });
          return res.status(500).json({ error: insertError });
        });
        return;
      }

      const factors = await dataModel.getQCMESFactors(fileId);
      //console.log(`Multiplying factors for QC MES 5 ppm (fileId: ${fileId}):`, factors);
      
      //this will store the values in _corrected coloumn of each elements in sample_data table
      await dataModel.applyCorrectionFactors(fileId, factors);

      db.run('COMMIT');
      res.status(200).json({
        message: 'File uploaded and processed successfully',
        fileId,
      });

    } catch (err) {
      console.error('[uploadFile] Error:', err);
      db.run('ROLLBACK', () => {
        fs.unlink(savedFilePath, unlinkErr => {
          if (unlinkErr) console.error('Failed to delete file on error:', unlinkErr);
        });
        res.status(500).json({ error: 'Database or CSV processing failed' });
      });
    }
  });
};

//new method to get list of uploaded file
const getUploadedFiles = async (req, res) => {
  try {
    const files = await fileModel.getAllFiles();

    res.json({
      success: true,
      files: files.map(file => ({
        id: file.id,
        filename: file.filename,
        filepath: file.filepath,
        uploaded_at: file.uploaded_at
      }))
    });
  } catch (err) {
    console.error('Error fetching uploaded files:', err);
    res.status(500).json({ error: 'Failed to fetch uploaded files', message: err.message });
  }
};

module.exports = { uploadFile, getUploadedFiles };
