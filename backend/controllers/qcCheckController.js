const QcCheckService = require('../services/qcCheckService');
const fileModel = require('../models/fileModel');

class QcCheckController {

  

  static async meta(req, res) {
    // The frontend sends file_id as a query parameter (e.g., /file-meta?file_id=123)
    const fileId = req.query.file_id;

    if (isNaN(fileId)) {
        return res.status(400).json({ message: 'Invalid file ID provided.' });
    }

    try {
        const metadata = await fileModel.getFileMetadata(fileId);

        if (metadata) {
            const Type = metadata.type===1 ? 'Major Elements' : 'Trace elements';
          
            // Adjust response keys to match what the frontend expects (filename, uploaded_at, uploaded_by)
            const responseHeaders = {
                filename: metadata.filename,
                uploaded_at: metadata.uploaded_at , // Frontend expects 'uploaded_at'
                uploaded_by: 'user2', // Still a placeholder as it's not in your DB schema
                file_type: Type // Changed to match common snake_case for consistency
            };
            return res.status(200).json(responseHeaders);
        } else {
            return res.status(404).json({ message: `File with ID ${fileId} not found.` });
        }
    } catch (error) {
        console.error('Error in qcCheckController.meta:', error.message);
        return res.status(500).json({ message: 'Internal server error while fetching file metadata.' });
    }
}

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
      const { file_id, start_date, end_date } = req.query;
      
      const solution_label =  await QcCheckService.getSolutionLabelsForFile(file_id);

      if (!file_id && !(start_date && end_date)) {
        return res.status(400).json({
          success: false,
          message: 'A file_id or a start_date and end_date range is required'
        });
      }

      let summary;
    
    if (file_id) {
      const solution_label =  await QcCheckService.getSolutionLabelsForFile(file_id);
      summary = await QcCheckService.getSummaryForQC(file_id, solution_label);
    } 
    else if (start_date && end_date) {
      
      let sd= start_date ;

      let ed= end_date;
      console.log('Start Date:', sd, 'End Date:', ed);
      
      

      summary = await QcCheckService.getSummaryForQCByDates(sd, ed);
    }
    // console.log('Summary:', summary); 


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
