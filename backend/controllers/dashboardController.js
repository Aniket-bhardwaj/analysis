const DashboardService = require('../services/dashboardService');

class DashboardController {
  /**
   * GET /api/dashboard
   * Get complete dashboard data
   */
  static async getDashboard(req, res) {
    try {
      const dashboardData = await DashboardService.getDashboardData();
      
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

  /**
   * GET /api/dashboard/summary
   * Get dashboard summary statistics only
   */
  static async getSummary(req, res) {
    try {
      const dashboardData = await DashboardService.getDashboardData();
      
      res.status(200).json({
        success: true,
        data: {
          summary: dashboardData.summary,
          qcStatistics: dashboardData.qcStatistics
        },
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Dashboard summary error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard summary',
        message: err.message
      });
    }
  }

  /**
   * GET /api/dashboard/qc-chart
   * Get QC chart data only
   */
  static async getQCChart(req, res) {
    try {
      const qcChartData = await DashboardService.getQCChartData();
      
      res.status(200).json({
        success: true,
        data: qcChartData,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('QC chart data error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch QC chart data',
        message: err.message
      });
    }
  }

  /**
   * GET /api/dashboard/recent-activity
   * Get recent activity data
   */
  static async getRecentActivity(req, res) {
    try {
      const recentActivity = await DashboardService.getRecentActivity();
      
      res.status(200).json({
        success: true,
        data: recentActivity,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Recent activity error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent activity',
        message: err.message
      });
    }
  }

  /**
   * GET /api/dashboard/stats
   * Get detailed statistics
   */
  static async getStats(req, res) {
    try {
      const { timeframe = 'week' } = req.query;
      
      // For now, we only support week timeframe
      // Future enhancement: support month, quarter, year
      if (timeframe !== 'week') {
        return res.status(400).json({
          success: false,
          error: 'Invalid timeframe. Only "week" is currently supported.'
        });
      }

      const stats = await DashboardService.getQCStatistics();
      
      res.status(200).json({
        success: true,
        data: {
          timeframe,
          statistics: stats
        },
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Dashboard stats error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard statistics',
        message: err.message
      });
    }
  }

  /**
   * GET /api/dashboard/health
   * Get dashboard health check
   */
  static async getHealth(req, res) {
    try {
      // Basic health check - try to get summary data
      const dashboardData = await DashboardService.getDashboardData();
      
      res.status(200).json({
        success: true,
        status: 'healthy',
        data: {
          totalFiles: dashboardData.summary.totalFiles,
          totalSamples: dashboardData.summary.totalSamples,
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