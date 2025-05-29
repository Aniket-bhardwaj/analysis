// routes/graphRoutes.js
const express = require('express');
const router = express.Router();
const GraphController = require('../controllers/graphController');

// Get graph data for a specific file and solution (separate original/corrected)
router.get('/graph-data', GraphController.getGraphDataByFileId);

// Get comparison data (original vs corrected in one response)  
router.get('/comparison-data', GraphController.getComparisonGraphData);

// Get available solution labels for a file
router.get('/solution-labels', GraphController.getSolutionLabels);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = router;