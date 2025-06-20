// controllers/tableController.js
const TableModel = require('../models/tableModel');
const fileModel = require('../models/fileModel');
const miniTableService = require('../services/miniTableService');
const tableService = require('../services/tableService');
const QcCheckService = require('../services/qcCheckService');



class TableController {


  static async getMiniTableData(req, res) {
    try {
      const { file_id, element } = req.query;
      const solution_label= await QcCheckService.getSolutionLabelsForFile(file_id);


      if (!file_id || !solution_label || !element) {
        return res.status(400).json({
          success: false,
          message: 'file_id, solution_label, and element are required'
        });
      }

      const data = await miniTableService.getMiniTableForElement(
        parseInt(file_id),
        solution_label,
        element
      );
      // console.log("🚀 Sending mini table response:", data);

      return res.json({
        success: true,
        miniTable: data
      });

    } catch (error) {
      console.error('[TableController] Error in getMiniTableData:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get mini table data',
        error: error.message
      });
    }
  }

  static async getSJSMiniTableData(req, res) {
  try {
    const { file_id, element } = req.query;

    if (!file_id || !element) {
      return res.status(400).json({
        success: false,
        message: 'file_id and element are required'
      });
    }

    const solutionLabel = 'SJS-Std';

    const data = await miniTableService.getSJSMiniTableForElement(
      parseInt(file_id),
      solutionLabel,
      element
    );

    return res.json({
      success: true,
      miniTable: data
    });

  } catch (error) {
    console.error('[TableController] Error in getSJSMiniTableData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mini table data',
      error: error.message
    });
  }
}



    static async getSJSTableDataByFile(req, res) {
  try {
    const { file_id } = req.query;

    if (!file_id) {
      return res.status(400).json({
        success: false,
        message: 'file_id is required'
      });
    }

    const solutionlabel = 'SJS-Std';

    const result = await tableService.getSJSTableData(parseInt(file_id),solutionlabel);

    if (!result.tableData || result.tableData.length === 0) {
      return res.json({
        success: true,
        message: 'No data found',
        tableData: [],
        elements: [],
        solutionLabel: result.solutionLabel || null
      });
    }

    return res.json({
      success: true,
      tableData: result.tableData,
      elements: result.elements,
      solutionLabel: result.solutionLabel || null
    });

  } catch (error) {
    console.error('[TableController] Error fetching SJS table data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SJS table data',
      error: error.message
    });
  }
}

  // Get comprehensive file summary
  static async getFileSummary(req, res) {
    try {
      const { file_id } = req.query;

      if (!file_id) {
        return res.status(400).json({
          success: false,
          message: 'file_id is required'
        });
      }

      console.log(`[TableController] Fetching file summary for file_id: ${file_id}`);

      const result = await TableModel.getFileSummary(parseInt(file_id));

      res.json({
        success: true,
        ...result,
        message: 'File summary retrieved successfully'
      });

    } catch (error) {
      console.error('[TableController] Error fetching file summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch file summary',
        error: error.message
      });
    }
  }

  
  // Helper method to assess overall data quality
  static assessDataQuality(elementData) {
    const rsd = elementData.rsd;
    const withinTolerance = elementData.isWithinTolerance;
    const sampleCount = elementData.sampleCount;

    let score = 0;
    let factors = [];

    // RSD scoring
    if (rsd <= 2) { score += 40; factors.push('Excellent precision (RSD ≤ 2%)'); }
    else if (rsd <= 5) { score += 30; factors.push('Good precision (RSD ≤ 5%)'); }
    else if (rsd <= 10) { score += 20; factors.push('Acceptable precision (RSD ≤ 10%)'); }
    else { score += 5; factors.push('Poor precision (RSD > 10%)'); }

    // Accuracy scoring
    if (withinTolerance) { score += 30; factors.push('Within error tolerance'); }
    else { score += 0; factors.push('Outside error tolerance'); }

    // Sample size scoring
    if (sampleCount >= 10) { score += 20; factors.push('Adequate sample size (n ≥ 10)'); }
    else if (sampleCount >= 5) { score += 15; factors.push('Moderate sample size (n ≥ 5)'); }
    else { score += 5; factors.push('Small sample size (n < 5)'); }

    // Data range scoring
    if (elementData.distributionData && elementData.distributionData.length > 0) {
      score += 10;
      factors.push('Complete distribution data available');
    }

    return {
      score: score,
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
      factors: factors,
      overall: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor'
    };
  }

}

module.exports = TableController;