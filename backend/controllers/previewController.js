const fileModel = require('../models/fileModel');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const previewFile = (req, res) => {
  const { storedName } = req.params;

  fileModel.getFileByStoredName(storedName, (err, file) => {
    if (err || !file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', storedName);
    const results = [];
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        if (results.length < 5) {
          results.push(data);
        }
      })
      .on('end', () => {
        res.json(results);
      })
      .on('error', (error) => {
        console.error('CSV parse error:', error.message);
        res.status(500).json({ error: 'Failed to parse CSV' });
      });
  });
};

module.exports = { previewFile };
