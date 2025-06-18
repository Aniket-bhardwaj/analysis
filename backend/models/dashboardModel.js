const db = require('../config/database'); // Assuming you have a database config

const dashboardModel = {
  /**
   * Get total count of uploaded files
   */
  async getTotalFilesCount() {
    try {
      const query = `SELECT COUNT(*) as count FROM files`;
      const result = await db.query(query);
      return result[0]?.count || 0;
    } catch (err) {
      console.error('Error getting total files count:', err);
      throw err;
    }
  },

  /**
   * Get total count of samples
   */
  async getTotalSamplesCount() {
    try {
      const query = `SELECT COUNT(*) as count FROM sample_data`;
      const result = await db.query(query);
      return result[0]?.count || 0;
    } catch (err) {
      console.error('Error getting total samples count:', err);
      throw err;
    }
  },

  /**
   * Get files uploaded in the past week
   */
  async getFilesUploadedThisWeek() {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM files 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `;
      const result = await db.query(query);
      return result[0]?.count || 0;
    } catch (err) {
      console.error('Error getting files uploaded this week:', err);
      throw err;
    }
  },

  /**
   * Get QC data for the past week for charting
   */
  async getQCDataPastWeek() {
    try {
      const query = `
        SELECT 
          DATE(qc_data.created_at) as date,
          qc_data.file_id,
          qc_data.\`Solution Label\` as solution_label,
          files.type as file_type,
          qc_data.created_at
        FROM qc_data 
        JOIN files ON qc_data.file_id = files.id
        WHERE qc_data.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND qc_data.\`Solution Label\` LIKE '%QC MES%'
        ORDER BY qc_data.created_at ASC
      `;
      const result = await db.query(query);
      return result || [];
    } catch (err) {
      console.error('Error getting QC data for past week:', err);
      throw err;
    }
  },

  /**
   * Get QC pass/fail statistics for the past week
   */
  async getQCStatsForWeek() {
    try {
      const query = `
        SELECT 
          DATE(qc_data.created_at) as date,
          COUNT(*) as total_qc_runs,
          files.type as file_type
        FROM qc_data 
        JOIN files ON qc_data.file_id = files.id
        WHERE qc_data.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND qc_data.\`Solution Label\` LIKE '%QC MES%'
        GROUP BY DATE(qc_data.created_at), files.type
        ORDER BY date ASC
      `;
      const result = await db.query(query);
      return result || [];
    } catch (err) {
      console.error('Error getting QC stats for week:', err);
      throw err;
    }
  },

  /**
   * Get recent file uploads with basic info
   */
  async getRecentFiles(limit = 5) {
    try {
      const query = `
        SELECT 
          id,
          original_name,
          type,
          created_at
        FROM files 
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      const result = await db.query(query, [limit]);
      return result || [];
    } catch (err) {
      console.error('Error getting recent files:', err);
      throw err;
    }
  },

  /**
   * Get dashboard summary statistics
   */
  async getDashboardSummary() {
    try {
      const [totalFiles, totalSamples, weeklyFiles] = await Promise.all([
        this.getTotalFilesCount(),
        this.getTotalSamplesCount(),
        this.getFilesUploadedThisWeek()
      ]);

      return {
        totalFiles,
        totalSamples,
        weeklyFiles
      };
    } catch (err) {
      console.error('Error getting dashboard summary:', err);
      throw err;
    }
  }
};

module.exports = dashboardModel;