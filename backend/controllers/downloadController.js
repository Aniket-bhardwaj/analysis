const path = require('path');
const fileModel = require('../models/fileModel');


/*************************/
// 1.Download file by ID
/*************************/
exports.downloadFile = async (req, res) => {
  const fileId = req.params.id;

  // use the model to fetch file data
  const row = await fileModel.getFileById(fileId);

  const absoluteFilePath = path.join(__dirname, "..", row.path);

  res.download(absoluteFilePath, row.filename, (downloadErr) => {
    if (downloadErr) {
      console.error("File download error:", downloadErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to download file" });
      }
    }
  });
};

