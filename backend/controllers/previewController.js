const fileModel = require('../models/fileModel');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const previewFile = async (req, res) => {
  const { fileName } = req.params;

  try {
    const file = await fileModel.getFileByName(fileName);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    const results = [];
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

  } catch (err) {
    console.error('DB error:', err.message);
    res.status(500).json({ error: 'Database operation failed' });
  }
};

module.exports = { previewFile };
