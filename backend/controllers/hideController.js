const fileModel = require('../models/fileModel');

const hideFile = (req, res) => {
  const { id } = req.params;
  fileModel.hideFileById(id, (err, result) => {
    if (err) {
      console.error('DB hide error:', err.message);
      return res.status(500).json({ error: 'Failed to hide file' });
    }
    res.json(result);
  });
};

module.exports = { hideFile };
