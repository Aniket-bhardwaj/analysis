const express = require('express');
const router = express.Router();
const graphController = require('../controllers/graphController');

router.get('/graph-data', graphController.getGraphData);

module.exports = router;