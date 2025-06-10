const path = require('path');
const fileModel = require('../models/fileModel');


/*************************/
// 1.Download file by ID
/*************************/
exports.downloadFile = (req, res) => {
  const fileId = req.params.id;

  // use the model to fetch file data
  fileModel.getFileById(fileId, (err, row) => {
    if (err) {
      console.error('DB error on download:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'File not found or is hidden' });
    }

    const absoluteFilePath = path.join(__dirname, '..', row.path);

    res.download(absoluteFilePath, row.filename, (downloadErr) => {
      if (downloadErr) {
        console.error('File download error:', downloadErr);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      }
    });
  });
};
