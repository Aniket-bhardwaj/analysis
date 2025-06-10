// routes/downloadRouter.js
const express = require('express');
const { downloadFile } = require('../controllers/downloadController');
const router = express.Router();

// Use GET for downloads (more REST-conventional), or switch to POST if you prefer
router.get('/download-file/:id', downloadFile);

module.exports = router;