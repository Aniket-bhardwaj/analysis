const path = require('path');
const fs = require('fs');
const db = require('../initialize_db');
const fileModel = require('../models/fileModel');
const dataModel = require('../models/dataModel');
const {
  parseHeaders,
  checkColumnCount,
  validateHeaderNames,
  parseDataRows,
  splitSamplesAndQC,
} = require('../utils/csvHandler');
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

      // Check if file already exists in DB
      const exists = await fileModel.fileExists(originalName);
      if (exists) {
        db.run('ROLLBACK', () => {
          fs.unlink(savedFilePath, err => {
            if (err) console.error('Failed to delete duplicate file:', err);
          });
          return res.status(400).json({ error: 'File already present' });
        });
        return;
      }

      // Step 1-3: parse headers and detect + validate CSV type
      const headers = await parseHeaders(savedFilePath);
      const csvType = checkColumnCount(headers);

      if (csvType === 0 || !validateHeaderNames(headers, csvType)) {
        db.run('ROLLBACK', () => {
          fs.unlink(savedFilePath, err => {
            if (err) console.error('Failed to delete invalid header file:', err);
          });
          return res.status(400).json({ error: 'Invalid or unsupported CSV headers' });
        });
        return;
      }

      // Insert file metadata and get file id
      const fileRow = await fileModel.insertFile(originalName, savedFilePath);
      const fileId = fileRow.id;

      // Step 4: parse data rows (skipping 2nd row internally)
      const allRows = await parseDataRows(savedFilePath);

      // Step 5: split into samples and QC rows
      const { samples, qc } = splitSamplesAndQC(allRows);



      // === Insert all QC rows ===
      for (const row of qc) {
        await dataModel.insertQCRow(row, fileId);
      }


      // Process samples 
  for (const row of samples) {
    const solutionLabel = row['Solution Label'];
    if (!solutionLabel) continue;

    const sampleExists = await dataModel.sampleExists(solutionLabel);
    if (sampleExists) {
        await dataModel.updateSample(solutionLabel, row);
    } else {
        await dataModel.insertSample(row);
    }
    await dataModel.insertSampleFileMapping(solutionLabel, fileId);
  }

      db.run('COMMIT');
      res.status(200).json({ message: 'File uploaded and processed successfully', fileId });

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
  } catch(err){
    console.error('Error fetching uploaded files:', err);
    res.status(500).json({ error: 'Failed to fetch uploaded files' , message: err.message});
  }
};

module.exports = { uploadFile, getUploadedFiles };
