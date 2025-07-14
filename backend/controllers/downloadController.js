const DownloadService = require('../services/downloadService');

exports.downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const { buffer, filename } = await DownloadService.createZipWithCSVs(fileId);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length
    });

    return res.send(buffer);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to download file' });
  }
};
