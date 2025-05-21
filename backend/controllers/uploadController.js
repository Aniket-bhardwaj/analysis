const path = require('path');
const fileModel = require('../models/fileModel');

const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const originalName = req.file.originalname;
  const savedFilePath = path.join('uploads', originalName);

  try {
    const exists = await fileModel.fileExists(originalName);
    if (exists) {
      return res.status(400).json({ error: 'File already present' });
    }

    console.log('Upload received:', originalName, savedFilePath);

    const row = await fileModel.insertFile(originalName, savedFilePath);

    console.log('File inserted into DB:', row);
    res.status(200).json(row);

  } catch (err) {
    console.error('DB error:', err.message);
    res.status(500).json({ error: 'Database operation failed' });
  }
};

module.exports = { uploadFile };
