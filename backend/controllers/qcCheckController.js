const QcCheckService = require('../services/qcCheckService');
const fileModel = require('../models/fileModel');

class QcCheckController {

  static async meta(req, res) {
    const fileId = req.query.file_id || req.body.file_id;
    const { isAdmin, orgId } = req.rbac || {};

    if (isNaN(fileId)) {
      return res.status(400).json({ message: 'Invalid file ID provided.' });
    }

    try {

      const metadata = await fileModel.getFileMetadata(fileId, isAdmin, orgId);

      if (metadata) {
        const Type = metadata.type === 1 ? 'Major Elements' : 'Trace elements';
        const responseHeaders = {
          filename: metadata.filename,
          uploaded_at: metadata.uploaded_at,
          uploaded_by: 'user2', // TODO: replace placeholder once schema supports uploader
          file_type: Type
        };
        return res.status(200).json({ success: true, ...responseHeaders });
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
      const { isAdmin, orgId } = req.rbac || {};

      if (!file_id) {
        return res.status(400).json({ success: false, message: 'file_id is required' });
      }

      const result = await QcCheckService.getSolutionLabelsForFile(file_id, isAdmin, orgId);

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
      const { isAdmin, orgId } = req.rbac || {};

      if (!file_id && !(start_date && end_date)) {
        return res.status(400).json({
          success: false,
          message: 'A file_id or a start_date and end_date range is required'
        });
      }

      let summary;
      let computedRows = [];
      let detailRows = [];
      let sjsRows = []; 

      if (file_id) {
        const solution_label = await QcCheckService.getSolutionLabelsForFile(file_id, isAdmin, orgId);
        summary = await QcCheckService.getSummaryForQC(file_id, solution_label, isAdmin, orgId);

        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const db = new sqlite3.Database(path.join(__dirname, '../database.sqlite'));

        computedRows = await new Promise((resolve, reject) => {
          db.all(
            `SELECT 
                element,
                fullElementName,
                valueAvg AS valueAvg,
                correctedValueAvg AS correctedValueAvg,
                rsd AS rsd,
                errorPercentage AS errorPercentage,
                "Solution Label" AS solutionLabel,
                rowType
            FROM qc_data
            WHERE file_id = ? AND rowType = 'computed'`,
            [file_id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        const sjsCols = require("../colHeaders").OTstdcleaned
          .concat(require("../colHeaders").OMstdcleaned)
          .map(col => `"${col}"`)   
          .join(", ");

        sjsRows = await new Promise((resolve) => {
          db.all(
            `SELECT 
                id,
                file_id,
                label,
                ${sjsCols}
            FROM sjs
            WHERE file_id = ?`,
            [file_id],
            (err, rows) => {
              if (err) {
                console.error("Error fetching SJS rows:", err.message);
                resolve([]);
              } else {
                resolve(rows);
              }
            }
          );
        });




        detailRows = await new Promise((resolve) => {
          db.all(
            `SELECT 
                element,
                fullElementName,
                valueAvg,
                correctedValueAvg,
                rsd,
                errorPercentage,
                "Solution Label" AS solutionLabel,
                rowType
            FROM qc_data
            WHERE file_id = ? AND rowType = 'computed'`,
            [file_id],
            (err, rows) => {
              if (err) {
                console.error("Error fetching detailRows:", err.message);
                resolve([]);
              } else {
                resolve(rows);
              }
            }
          );
        });




        db.close();
      } else if (start_date && end_date) {
        const sd = start_date;
        const ed = end_date;
        summary = await QcCheckService.getSummaryForQCByDates(sd, ed, isAdmin, orgId);
      }

      return res.json({
        success: true,
        summary,
        qcData: computedRows,   
        data: { data: detailRows || [], totalItems: detailRows.length, currentPage: 1 },
        sjsData : sjsRows
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
