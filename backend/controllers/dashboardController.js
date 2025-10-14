const DashboardService = require('../services/dashboardService');
const dashboardModel = require('../models/dashboardModel');

class DashboardController {

  static async getDashboard(req, res) {
    try {
      const { isAdmin, orgId } = req.rbac;
      const dashboardData = await DashboardService.getDashboardData(isAdmin, orgId);

      res.status(200).json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Dashboard controller error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
        message: err.message
      });
    }
  }


  static async getTotalFiles(req, res) {
    try {
      const { isAdmin, orgId } = req.rbac;
      const totalFiles = await dashboardModel.getTotalFilesCount(isAdmin, orgId);

      res.status(200).json({
        success: true,
        data: { totalFiles },
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Get total files error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch total files count',
        message: err.message
      });
    }
  }


  static async getTotalSamples(req, res) {
    try {
      const { isAdmin, orgId } = req.rbac;
      const totalSamples = await DashboardService.getTotalSamples(isAdmin, orgId);

      res.status(200).json({
        success: true,
        data: { totalSamples },
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Get total samples error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch total samples count',
        message: err.message
      });
    }
  }


  static async getQCPassRate(req, res) {
    try {
      const { isAdmin, orgId } = req.rbac;
      const qcStats = await DashboardService.getQCPassRate(isAdmin, orgId);

      res.status(200).json({
        success: true,
        data: qcStats,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Get QC pass rate error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch QC pass rate',
        message: err.message
      });
    }
  }


  static async getQCGraphData(req, res) {
    try {
      const { isAdmin, orgId } = req.rbac;
      const result = await DashboardService.fetchQCGraphDataLastWeek(isAdmin, orgId);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Controller Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }


  static async getHealth(req, res) {
    try {
      const { isAdmin, orgId } = req.rbac;
      const dashboardData = await DashboardService.getDashboardData(isAdmin, orgId);

      res.status(200).json({
        success: true,
        status: 'healthy',
        data: {
          totalFiles: dashboardData.totalFiles,
          totalSamples: dashboardData.totalSamples,
          qcPassRate: dashboardData.qcPassRate,
          lastCheck: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error('Dashboard health check error:', err);
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Dashboard service unavailable',
        message: err.message,
        lastCheck: new Date().toISOString()
      });
    }
  }
}

module.exports = DashboardController;

