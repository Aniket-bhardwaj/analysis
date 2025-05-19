const express = require('express');
const { hideFile } = require('../controllers/hideController');
const router = express.Router();

router.post('/hide-file/:id', hideFile);

module.exports = router;
