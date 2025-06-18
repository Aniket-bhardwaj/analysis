const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');

// Dashboard routes
router.get('/', DashboardController.getDashboard);
router.get('/summary', DashboardController.getSummary);
router.get('/qc-chart', DashboardController.getQCChart);
router.get('/recent-activity', DashboardController.getRecentActivity);
router.get('/stats', DashboardController.getStats);
router.get('/health', DashboardController.getHealth);

module.exports = router;