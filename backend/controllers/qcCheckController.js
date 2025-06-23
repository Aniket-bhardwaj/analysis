const QcCheckService = require('../services/qcCheckService');

class QcCheckController {

  static async meta(req, res) {
    // Extract the 'id' from the request parameters.
    // Ensure the ID is parsed as an integer, as it's expected to be a number.
    const fileId = parseInt(req.params.id, 10);

    // Basic validation: Check if the fileId is a valid number.
    if (isNaN(fileId)) {
        return res.status(400).json({ message: 'Invalid file ID provided.' });
    }

    try {
        // Call the service layer to get the file metadata.
        const metadata = await QcCheckServices.getFileMetadata(fileId);

        // If metadata is found, construct and send the successful response.
        if (metadata) {
            // As 'uploaded_by' is not in your 'uploaded_files' table schema,
            // we will explicitly state it's not available from this query.
            // If you have a separate 'users' table and a 'user_id' in 'uploaded_files',
            // you would perform a JOIN query in the service to fetch user details.
            const responseHeaders = {
                filename: metadata.filename,
                'uploaded at': metadata.uploadedAt, // Space in key requires quotes
                'uploaded by': 'Not available from this table', // Placeholder
                'file type': metadata.fileType // Space in key requires quotes
            };
            return res.status(200).json(responseHeaders);
        } else {
            // If no metadata is found for the given ID, send a 404 Not Found response.
            return res.status(404).json({ message: `File with ID ${fileId} not found.` });
        }
    } catch (error) {
        // Catch any errors from the service layer and send a 500 Internal Server Error response.
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
