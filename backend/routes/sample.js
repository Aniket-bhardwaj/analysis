const express = require('express');
const router = express.Router();
const SampleController = require('../controllers/sampleController');

router.get('/sample-details', SampleController.getSampleElementDetails);
router.get('/samples',SampleController.getAllSamples);

module.exports = router;
