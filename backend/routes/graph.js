const express = require('express');
const router = express.Router();
const graphController = require('../controllers/graphController');

router.get('/graph/:id', graphController.getGraphData);

module.exports = router;
