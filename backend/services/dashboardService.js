const dashboardModel = require('../models/dashboardModel');
const qcCheckService = require('./qcCheckService');
const { MEconc, TEconc } = require('../colHeaders');


const ELEMENT_TABLES = {
  1: MEconc,
  2: TEconc,
};

class DashboardService {
  /**
   * Get dashboard data - total files, total samples, QC pass rate, and graph data
   */
  static async getDashboardData() {
    try {
      //console.log('Getting dashboard data...');
  
      const [summary] = await Promise.all([
        dashboardModel.getDashboardSummary() // 👈 use your function
      ]);
  
      //console.log('Dashboard summary received:', summary);
      // console.log('QC graph raw data received:', qcGraphRaw);
  
      return {
        totalFiles: summary.totalFiles,
        totalSamples: summary.totalSamples,
        qcPassRate: summary.qcPassRate,
        qcStats: {
          totalChecks: summary.qcTotalChecks,
          passedChecks: summary.qcPassedChecks,
          passRate: summary.qcPassRate
        } // 👈 directly return raw output
      };
    } catch (err) {
      console.error('Dashboard service error:', err);
      throw new Error('Failed to get dashboard data: ' + err.message);
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

 
  //  Get QC Graph Data for Dashboard
  
  static async fetchQCGraphDataLastWeek() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
  
    const formattedStart = this.formatDate(startDate);  // "YYYY-MM-DD"
    const formattedEnd = this.formatDate(endDate);
  
    // Call model to get already-processed data
    const result = await dashboardModel.getQCGraphDataLastWeek(formattedStart, formattedEnd);
  
    // Validate result
    if (!result || !result.success || typeof result.graphData !== 'object') {
      throw new Error('Invalid QC graph data received from model');
    }
  
    return result;  // Return directly to be used in getDashboardData
  }
  static formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  static parseTimestamp(ts) {
    if (typeof ts !== 'string') return null;
    const [datePart, timePart] = ts.split(' ');
    if (!datePart || !timePart) return null;

    const [day, month, year] = datePart.split('-');
    if (!day || !month || !year) return null;

    const isoFormat = `${year}-${month}-${day}T${timePart}`;
const parsed = new Date(isoFormat);
return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
}


module.exports = DashboardService;