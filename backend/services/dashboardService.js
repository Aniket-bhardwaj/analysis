const dashboardModel = require('../models/dashboardModel');
const qcCheckService = require('./qcCheckService');

class DashboardService {
  /**
   * Get dashboard data - total files, total samples, QC pass rate, and graph data
   */
  static async getDashboardData() {
    try {
      console.log('Getting dashboard data...');
      
      const [summary, qcGraphData] = await Promise.all([
        dashboardModel.getDashboardSummary(),
        dashboardModel.getQCGraphDataForDashboard()
      ]);
      
      console.log('Dashboard summary received:', summary);
      console.log('QC graph data received:', qcGraphData);

      return {
        totalFiles: summary.totalFiles,
        totalSamples: summary.totalSamples,
        qcPassRate: summary.qcPassRate,
        qcStats: {
          totalChecks: summary.qcTotalChecks,
          passedChecks: summary.qcPassedChecks,
          passRate: summary.qcPassRate
        },
        qcGraphData: this.processQCGraphData(qcGraphData)
      };
    } catch (err) {
      console.error('Dashboard service error:', err);
      throw new Error('Failed to get dashboard data: ' + err.message);
    }
  }

  /**
   * Get individual statistics
   */
  static async getTotalFiles() {
    try {
      return await dashboardModel.getTotalFilesCount();
    } catch (err) {
      console.error('Error getting total files:', err);
      throw err;
    }
  }

  static async getTotalSamples() {
    try {
      return await dashboardModel.getTotalSamplesCount();
    } catch (err) {
      console.error('Error getting total samples:', err);
      throw err;
    }
  }

  static async getQCPassRate() {
    try {
      return await dashboardModel.getQCPassRate();
    } catch (err) {
      console.error('Error getting QC pass rate:', err);
      throw err;
    }
  }

  /**
   * Get QC Graph Data for Dashboard
   */
  static async getQCGraphData() {
    try {
      const result = await dashboardModel.getQCGraphDataForDashboard();
      return this.processQCGraphData(result);
    } catch (err) {
      console.error('Error getting QC graph data:', err);
      throw err;
    }
  }

  /**
   * Process QC graph data for dashboard visualization
   */
  static processQCGraphData(result) {
    if (!result.success || !result.graphData) {
      return {
        success: false,
        graphData: {},
        message: 'No QC graph data available'
      };
    }

    const processedData = {};
    const elementNames = Object.keys(result.graphData);

    elementNames.forEach(element => {
      const elementData = result.graphData[element];
      
      if (elementData && elementData.length > 0) {
        // Group data points by date for better visualization
        const groupedByDate = {};
        
        elementData.forEach(point => {
          const date = new Date(point.timestamp).toDateString();
          if (!groupedByDate[date]) {
            groupedByDate[date] = [];
          }
          groupedByDate[date].push(point);
        });

        // Calculate daily averages
        const dailyAverages = Object.keys(groupedByDate).map(date => {
          const dayPoints = groupedByDate[date];
          const avgValue = dayPoints.reduce((sum, point) => sum + point.value, 0) / dayPoints.length;
          
          return {
            date: date,
            value: Math.round(avgValue * 100) / 100,
            dataPoints: dayPoints.length,
            fileTypes: [...new Set(dayPoints.map(p => p.fileType))],
            files: [...new Set(dayPoints.map(p => p.fileName))]
          };
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        processedData[element] = {
          rawData: elementData,
          dailyAverages: dailyAverages,
          totalDataPoints: elementData.length,
          dateRange: {
            start: elementData[0]?.timestamp,
            end: elementData[elementData.length - 1]?.timestamp
          }
        };
      }
    });

    return {
      success: true,
      graphData: processedData,
      summary: {
        totalElements: elementNames.length,
        totalFiles: result.fileCount || 0,
        totalDataPoints: Object.values(result.graphData).reduce((sum, arr) => sum + (arr?.length || 0), 0),
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      }
    };
  }
}

module.exports = DashboardService;