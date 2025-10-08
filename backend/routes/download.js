// routes/download.js
const express = require("express");
const {
  downloadFile,
  downloadPdf,
} = require("../controllers/downloadController");
const router = express.Router();

// Use GET for downloads (more REST-conventional), or switch to POST if you prefer
router.post("/download-file/:id", downloadFile);

router.post("/download-pdf/:id", downloadPdf);

module.exports = router;
