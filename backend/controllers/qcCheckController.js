const QcCheckService = require('../services/qcCheckService');

class QcCheckController {
  static async getSolutionLabels(req, res) {
    try {
      const { file_id } = req.query;

      if (!file_id) {
        return res.status(400).json({ success: false, message: 'file_id is required' });
      }

      const result = await QcCheckService.getSolutionLabelsForFile(file_id);

      return res.json({
        success: true,
        solutionLabels: result.solutionLabels,
        summary: result.summary
      });
    } catch (error) {
      console.error('[QcCheckController] Error fetching solution labels:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch solution labels',
        error: error.message
      });
    }
  }

  static async getSummary(req, res) {
    try {
      const { file_id } = req.query;
      const solution_label =  await QcCheckService.getSolutionLabelsForFile(file_id);

      if (!file_id || !solution_label) {
        return res.status(400).json({ success: false, message: 'file_id and solution_label are required' });
      }

      const summary = await QcCheckService.getSummaryForQC(file_id, solution_label);

      return res.json({
        success: true,
        summary
      });
    } catch (error) {
      console.error('[QcCheckController] Error fetching QC summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch QC summary',
        error: error.message
      });
    }
  }
}

module.exports = QcCheckController;
