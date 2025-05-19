const path = require('path');
const fileModel = require('../models/fileModel');
const csvToSQLite = require('../utils/csvToSQLite'); // <-- NEW

const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const originalName = req.file.originalname;
  const storedName = req.file.filename;
  const timestamp = Date.now();
  const savedFilePath = path.join('uploads', storedName);

  console.log('Upload received:', originalName, storedName, savedFilePath);
fileModel.insertFile(originalName, storedName, (err, row) => {
  if (err) {
    console.error('DB insert error:', err.message);
    return res.status(500).json({ error: 'Failed to insert file' });
  }
  console.log('File inserted into DB:', row);

  csvToSQLite(savedFilePath, originalName, timestamp)
    .then(() => {
      console.log('CSV content stored in SQLite successfully.');
      res.json(row);
    })
    .catch((parseErr) => {
      console.error('CSV to SQLite error:', parseErr);
      res.status(500).json({ error: 'Failed to store CSV content in DB' });
    });
});


};

module.exports = { uploadFile };
