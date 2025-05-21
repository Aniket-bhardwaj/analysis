const fileModel = require('../models/fileModel');

const listFiles = async (req, res) => {
  try {
    const rows = await fileModel.getVisibleFiles();
    res.json(rows);
  } catch (err) {
    console.error('DB fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

module.exports = { listFiles };
