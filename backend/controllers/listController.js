const fileModel = require('../models/fileModel');

const listFiles = (req, res) => {
  fileModel.getVisibleFiles((err, rows) => {
    if (err) {
      console.error('DB fetch error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch files' });
    }
    res.json(rows);
  });
};

module.exports = { listFiles };
