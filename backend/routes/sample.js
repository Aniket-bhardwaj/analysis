const express = require('express');
const router = express.Router();
const SampleController = require('../controllers/sampleController');

router.get('/sample-table', SampleController.getSampleTable);
router.get('/samples',SampleController.getAllSamples);

module.exports = router;
