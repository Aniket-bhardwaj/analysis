const express = require('express');
const router = express.Router();
const sampleController = require('../controllers/sampleController');

router.post('/sample-details', sampleController.getSampleElementDetails);

module.exports = router;
