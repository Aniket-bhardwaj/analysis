const express = require('express');
const router = express.Router();
const elementController = require('../controllers/elementController');

// Element Inspector data (graph)
router.get('/element-graph', elementController.getElementInspectorData);

// Element dropdown options
router.get('/element-options', elementController.getElementOptions);

module.exports = router;
