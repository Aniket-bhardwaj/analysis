const path = require('path');
const fileModel = require('../models/fileModel');
const parseCSVtoArray = require('../utils/parseCSVtoArray');

const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filename = req.file.originalname;
  const savedFilePath = path.join('uploads', filename);

  // Check if file with same name already exists
  fileModel.isFilenameExists(filename, (err, exists) => {
    if (err) {
      console.error('DB check error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (exists) {
      return res.status(400).json({ error: 'File with this name already uploaded' });
    }

    console.log('Upload received:', filename, savedFilePath);

    // Insert file into uploaded_files table
    fileModel.insertFile(filename, (err, row) => {
      if (err) {
        console.error('DB insert error:', err.message);
        return res.status(500).json({ error: 'Failed to insert file' });
      }

      // Parse CSV and insert into Data table
      parseCSVtoArray(savedFilePath)
        .then(() => {
          console.log('CSV content stored in Data table successfully.');
          res.json(row);
        })
        .catch((parseErr) => {
          console.error('CSV to DB error:', parseErr);
          res.status(500).json({ error: 'Failed to store CSV content in DB' });
        });
    });
  });
};

module.exports = { uploadFile };
