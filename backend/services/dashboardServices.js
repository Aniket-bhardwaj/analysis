const dashboardModel = require('../models/dashboardModel');
const QcCheckService = require('./qcCheckService');

class DashboardService {
  /**
   * Get comprehensive dashboard data
   */
  static async getDashboardData() {
    try {
      // Get basic statistics
      const summary = await dashboardModel.getDashboardSummary();
      
      // Get recent files
      const recentFiles = await dashboardModel.getRecentFiles(5);
      
      // Get QC data for charting
      const qcChartData = await this.getQCChartData();
      
      // Get QC statistics
      const qcStats = await this.getQCStatistics();

      return {
        summary: {
          totalFiles: summary.totalFiles,
          totalSamples: summary.totalSamples,
          weeklyFiles: summary.weeklyFiles,
          qcPassRate: qcStats.overallPassRate
        },
        recentFiles: recentFiles.map(file => ({
          id: file.id,
          name: file.original_name,
          type: file.type === 1 ? 'PPM' : 'PPB',
          uploadedAt: file.created_at
        })),
        qcChart: qcChartData,
        qcStatistics: qcStats
      };
    } catch (err) {
      console.error('Dashboard service error:', err);
      throw new Error('Failed to get dashboard data: ' + err.message);
    }
  }

  /**
   * Process QC data for chart visualization
   */
  static async getQCChartData() {
    try {
      const qcData = await dashboardModel.getQCDataPastWeek();
      const chartData = [];
      const processedFiles = new Set();

      for (const row of qcData) {
        // Avoid processing the same file multiple times
        const fileKey = `${row.file_id}_${row.solution_label}`;
        if (processedFiles.has(fileKey)) continue;
        
        processedFiles.add(fileKey);

        try {
          // Get QC summary for this file and solution
          const qcSummary = await QcCheckService.getSummaryForQC(
            row.file_id, 
            row.solution_label
          );

          const passRate = qcSummary.totalElements > 0 
            ? (qcSummary.elementsWithinTolerance / qcSummary.totalElements * 100)
            : 0;

          chartData.push({
            date: row.date,
            fileId: row.file_id,
            fileType: row.file_type === 1 ? 'PPM' : 'PPB',
            solutionLabel: row.solution_label,
            passRate: Math.round(passRate * 100) / 100,
            elementsWithinTolerance: qcSummary.elementsWithinTolerance,
            totalElements: qcSummary.totalElements,
            averageRSD: qcSummary.averageRSD,
            averageError: qcSummary.averageErrorPercentage,
            timestamp: row.created_at
          });
        } catch (qcError) {
          console.warn(`Failed to get QC summary for file ${row.file_id}:`, qcError.message);
          // Add basic entry even if QC calculation fails
          chartData.push({
            date: row.date,
            fileId: row.file_id,
            fileType: row.file_type === 1 ? 'PPM' : 'PPB',
            solutionLabel: row.solution_label,
            passRate: 0,
            elementsWithinTolerance: 0,
            totalElements: 0,
            averageRSD: 0,
            averageError: 0,
            timestamp: row.created_at,
            error: true
          });
        }
      }

      // Group by date for better visualization
      const groupedByDate = chartData.reduce((acc, item) => {
        const date = item.date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(item);
        return acc;
      }, {});

      // Create daily summaries
      const dailySummaries = Object.keys(groupedByDate)
        .sort()
        .map(date => {
          const dayData = groupedByDate[date];
          const avgPassRate = dayData.reduce((sum, item) => sum + item.passRate, 0) / dayData.length;
          const totalRuns = dayData.length;
          
          return {
            date,
            averagePassRate: Math.round(avgPassRate * 100) / 100,
            totalQCRuns: totalRuns,
            ppmRuns: dayData.filter(item => item.fileType === 'PPM').length,
            ppbRuns: dayData.filter(item => item.fileType === 'PPB').length,
            details: dayData
          };
        });

      return {
        dailySummaries,
        rawData: chartData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      };
    } catch (err) {
      console.error('Error processing QC chart data:', err);
      return {
        dailySummaries: [],
        rawData: []
      };
    }
  }

  /**
   * Calculate QC statistics
   */
  static async getQCStatistics() {
    try {
      const qcData = await dashboardModel.getQCDataPastWeek();
      
      if (!qcData || qcData.length === 0) {
        return {
          totalQCRuns: 0,
          overallPassRate: 0,
          averageRSD: 0,
          averageError: 0,
          ppmFiles: 0,
          ppbFiles: 0
        };
      }

      let totalPassingElements = 0;
      let totalElements = 0;
      let totalRSD = 0;
      let totalError = 0;
      let validCalculations = 0;
      const processedFiles = new Set();
      
      let ppmCount = 0;
      let ppbCount = 0;

      for (const row of qcData) {
        const fileKey = `${row.file_id}_${row.solution_label}`;
        if (processedFiles.has(fileKey)) continue;
        
        processedFiles.add(fileKey);

        if (row.file_type === 1) ppmCount++;
        else if (row.file_type === 2) ppbCount++;

        try {
          const qcSummary = await QcCheckService.getSummaryForQC(
            row.file_id, 
            row.solution_label
          );

          totalPassingElements += qcSummary.elementsWithinTolerance;
          totalElements += qcSummary.totalElements;
          totalRSD += qcSummary.averageRSD;
          totalError += qcSummary.averageErrorPercentage;
          validCalculations++;
        } catch (err) {
          console.warn(`Failed to calculate QC stats for file ${row.file_id}:`, err.message);
        }
      }

      const overallPassRate = totalElements > 0 
        ? (totalPassingElements / totalElements * 100)
        : 0;

      return {
        totalQCRuns: processedFiles.size,
        overallPassRate: Math.round(overallPassRate * 100) / 100,
        averageRSD: validCalculations > 0 
          ? Math.round((totalRSD / validCalculations) * 100) / 100 
          : 0,
        averageError: validCalculations > 0 
          ? Math.round((totalError / validCalculations) * 100) / 100 
          : 0,
        ppmFiles: ppmCount,
        ppbFiles: ppbCount
      };
    } catch (err) {
      console.error('Error calculating QC statistics:', err);
      return {
        totalQCRuns: 0,
        overallPassRate: 0,
        averageRSD: 0,
        averageError: 0,
        ppmFiles: 0,
        ppbFiles: 0
      };
    }
  }

  /**
   * Get recent activity summary
   */
  static async getRecentActivity() {
    try {
      const recentFiles = await dashboardModel.getRecentFiles(10);
      
      return recentFiles.map(file => ({
        id: file.id,
        name: file.original_name,
        type: file.type === 1 ? 'PPM' : 'PPB',
        uploadedAt: file.created_at,
        timeAgo: this.getTimeAgo(file.created_at)
      }));
    } catch (err) {
      console.error('Error getting recent activity:', err);
      throw new Error('Failed to get recent activity: ' + err.message);
    }
  }

  /**
   * Helper function to calculate time ago
   */
  static getTimeAgo(date) {
    const now = new Date();
    const uploadDate = new Date(date);
    const diffInMs = now - uploadDate;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
  }
}

module.exports = DashboardService;