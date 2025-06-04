// controllers/tableController.js
const TableModel = require('../models/tableModel');

class TableController {
  // Get table data by file ID
  static async getTableDataByFile(req, res) {
    try {
      const { file_id, solution_label } = req.query;
      
      if (!file_id) {
        return res.status(400).json({
          success: false,
          message: 'file_id is required'
        });
      }

      const solutionLabel = solution_label || 'QC_MES_5 ppm';
      
      console.log(`[TableController] Fetching table data for file_id: ${file_id}, solution_label: ${solutionLabel}`);
      
      const result = await TableModel.getQCTableData(parseInt(file_id), solutionLabel);
      
      if (!result.tableData || result.tableData.length === 0) {
        return res.json({
          success: true,
          message: 'No data found for the specified criteria',
          tableData: [],
          elements: [],
          solutionLabel: solutionLabel,
          totalSamples: 0
        });
      }

      res.json({
        success: true,
        tableData: result.tableData,
        elements: result.elements,
        solutionLabel: result.solutionLabel,
        totalSamples: result.totalSamples,
        summary: {
          totalElements: result.tableData.length,
          elementsWithinTolerance: result.tableData.filter(item => item.isWithinTolerance).length,
          averageRSD: result.tableData.reduce((sum, item) => sum + item.rsd, 0) / result.tableData.length
        }
      });

    } catch (error) {
      console.error('[TableController] Error fetching table data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch table data',
        error: error.message
      });
    }
  }

  // Get table data by date range
  static async getTableDataByDateRange(req, res) {
    try {
      const { start_date, end_date, solution_label } = req.query;
      
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'start_date and end_date are required'
        });
      }

      const solutionLabel = solution_label || 'QC_MES_5 ppm';
      
      console.log(`[TableController] Fetching table data for date range: ${start_date} to ${end_date}, solution_label: ${solutionLabel}`);
      
      const result = await TableModel.getQCTableDataByDateRange(start_date, end_date, solutionLabel);
      
      if (!result.tableData || result.tableData.length === 0) {
        return res.json({
          success: true,
          message: 'No data found for the specified date range',
          tableData: [],
          elements: [],
          solutionLabel: solutionLabel,
          totalSamples: 0,
          dateRange: { start_date, end_date }
        });
      }

      res.json({
        success: true,
        tableData: result.tableData,
        elements: result.elements,
        solutionLabel: result.solutionLabel,
        totalSamples: result.totalSamples,
        dateRange: result.dateRange,
        summary: {
          totalElements: result.tableData.length,
          elementsWithinTolerance: result.tableData.filter(item => item.isWithinTolerance).length,
          averageRSD: result.tableData.reduce((sum, item) => sum + item.rsd, 0) / result.tableData.length
        }
      });

    } catch (error) {
      console.error('[TableController] Error fetching table data by date range:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch table data by date range',
        error: error.message
      });
    }
  }

  // Get available solution labels for dropdown
  static async getSolutionLabelsForTable(req, res) {
    try {
      const { file_id } = req.query;
      
      if (!file_id) {
        return res.status(400).json({
          success: false,
          message: 'file_id is required'
        });
      }

      const solutionLabels = await TableModel.getAllSolutionLabelsForTable(parseInt(file_id));
      
      res.json({
        success: true,
        solutionLabels: solutionLabels
      });

    } catch (error) {
      console.error('[TableController] Error fetching solution labels:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch solution labels',
        error: error.message
      });
    }
  }

  // Get detailed element statistics
  static async getElementDetails(req, res) {
    try {
      const { file_id, element_name, solution_label } = req.query;
      
      if (!file_id || !element_name) {
        return res.status(400).json({
          success: false,
          message: 'file_id and element_name are required'
        });
      }

      const solutionLabel = solution_label || 'QC_MES_5 ppm';
      
      // This would require a more detailed query to get individual data points
      // for the specified element - implement as needed
      
      res.json({
        success: true,
        message: 'Element details endpoint - to be implemented',
        elementName: element_name,
        fileId: file_id,
        solutionLabel: solutionLabel
      });

    } catch (error) {
      console.error('[TableController] Error fetching element details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch element details',
        error: error.message
      });
    }
  }
}

module.exports = TableController;