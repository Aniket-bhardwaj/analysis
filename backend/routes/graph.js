const express = require('express');
const router = express.Router();
const graphController = require('../controllers/graphController');

router.get('/graph-data', graphController.getGraphData);
router.get('/graph-elements', graphController.getElements); // Legacy route for compatibility
router.get('/sjs-graph', graphController.getSJSGraphData); // NEW: SJS Graph

module.exports = router;