const express = require("express");
const router = express.Router();
const DashboardController = require("../controllers/dashboardController");

// Main dashboard route - gets all data (files, samples, QC pass rate, graph data)
router.post("/dashboard", DashboardController.getDashboard);

// Individual metric routes
router.post(
  "/dashboard/files",
  DashboardController.getTotalFiles
);
router.post(
  "/dashboard/samples",
  DashboardController.getTotalSamples
);
router.post(
  "/dashboard/qc-pass-rate",
  DashboardController.getQCPassRate
);

// QC graph data route
router.post(
  "/dashboard/qc-graph",
  DashboardController.getQCGraphData
);

// Health check route
router.post(
  "/dashboard/health",
  DashboardController.getHealth
);

// Alternative routes for backward compatibility (if needed)
router.post("/stats", DashboardController.getDashboard); // Maps to main dashboard
router.post(
  "/qc-graph",
  DashboardController.getQCGraphData
); // Alternative QC graph route
router.post("/health", DashboardController.getHealth); // Alternative health route

module.exports = router;
