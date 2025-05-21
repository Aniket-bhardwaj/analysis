const express = require('express');
const { previewFile } = require('../controllers/previewController');
const router = express.Router();

router.get('/preview/:filename', previewFile);

module.exports = router;
