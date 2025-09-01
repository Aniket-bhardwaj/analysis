// controllers/tableController.js
const TableModel = require('../models/tableModel');
const fileModel = require('../models/fileModel');
const miniTableService = require('../services/miniTableService');
const tableService = require('../services/tableService');
const QcCheckService = require('../services/qcCheckService');



class TableController {

  //===========================================
  //1. Get qc miniTableData by file_id and date range
  //===========================================
  static async getQcMiniTableData(req, res) {
  try {
    const { start_date, end_date, element, file_id } = req.query; // Destructure with snake_case
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    if (!element || (!file_id && (!start_date || !end_date))) { // Use file_id, start_date, end_date
      return res.status(400).json({
        success: false,
        message: 'Query must include an element and either a file_id or both a start_date and end_date.',
      });
    }

    let fileIdsToProcess = [];

    if (file_id) { // Use file_id
      // Ensure file_id is treated as an array for consistency, even if it's just one.
      // This simplifies logic if getFileIdsByDateRange returns an array of objects with id property.
      const numericFileId = parseInt(file_id, 10);
      if (!isNaN(numericFileId)) {
        fileIdsToProcess = [numericFileId];
      }
    } else {
      // Assuming getFileIdsByDateRange returns an array of IDs directly or an array of objects {id: ...}
      const ids = await fileModel.getFileIdsByDateRange(start_date, end_date); // Use start_date, end_date
      // Ensure we have an array of numbers
      fileIdsToProcess = ids.map(item => (typeof item === 'object' ? item.id : item)).filter(id => !isNaN(parseInt(id,10)));
    }

    if (!fileIdsToProcess || fileIdsToProcess.length === 0) {
      return res.json({
        success: true,
        message: 'No files found for the specified criteria.',
        miniTable: [],
        totalItems: 0,
        page,
        pageSize,
      });
    }

    let allMiniTableRowsForElement = [];
    for (const file_id_item of fileIdsToProcess) { 
      const solution_label = await QcCheckService.getSolutionLabelsForFile(file_id_item);

      if (!solution_label) {
        console.warn(`[TableController] Skipping file_id ${file_id_item} as no solution_label was found.`);
        continue;
      }

      const data = await miniTableService.getMiniTableForElement(
        file_id_item, // Already an int if coming from single file_id, or mapped to int
        solution_label,
        element
      );

      if (data && data.length > 0) {
        allMiniTableRowsForElement = allMiniTableRowsForElement.concat(data);
      }
    }

    const totalItems = allMiniTableRowsForElement.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = page * pageSize;
    const paginatedData = allMiniTableRowsForElement.slice(startIndex, endIndex);

    return res.json({
      success: true,
      miniTable: paginatedData,
      totalItems,
      page,
      pageSize,
    });

  } catch (error) {
    console.error('[TableController] Error in getQcMiniTableData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mini table data',
      error: error.message,
    });
  }
}

  static async getSJSMiniTableData(req, res) {
    try {
      const { start_date, end_date, element, file_id } = req.query;
      const page = parseInt(req.query.page, 10) || 1;
      const pageSize = parseInt(req.query.pageSize, 10) || 10;

      if (!element || (!file_id && (!start_date || !end_date))) {
        return res.status(400).json({
          success: false,
          message: 'Query must include an element and either a file_id or both a start_date and end_date.',
        });
      }

      let fileIdsToProcess = [];

      if (file_id) {
        const numericFileId = parseInt(file_id, 10);
        if (!isNaN(numericFileId)) {
          fileIdsToProcess = [numericFileId];
        }
      } else {
        const ids = await fileModel.getFileIdsByDateRange(start_date, end_date);
        fileIdsToProcess = ids.map(item => (typeof item === 'object' ? item.id : item)).filter(id => !isNaN(parseInt(id, 10)));
      }

      if (!fileIdsToProcess || fileIdsToProcess.length === 0) {
        return res.json({
          success: true,
          message: 'No files found for the specified criteria.',
          miniTable: [],
          totalItems: 0,
          page,
          pageSize,
        });
      }

      const solutionLabel = 'SJS-Std';
      let allMiniTableRowsForElement = [];

      for (const id of fileIdsToProcess) {
        // We need to fetch file type for each file to pass to getSJSMiniTableForElement if it needs it
        // Assuming getSJSMiniTableForElement can determine what it needs from file_id or if solution_label is enough
        // For now, directly calling with file_id and solution_label as per existing single file logic
        const data = await miniTableService.getSJSMiniTableForElement(
          id, // Use the numeric id from fileIdsToProcess
          solutionLabel,
          element
        );

        if (data && data.length > 0) {
          allMiniTableRowsForElement = allMiniTableRowsForElement.concat(data);
        }
      }

      const totalItems = allMiniTableRowsForElement.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = page * pageSize;
      const paginatedData = allMiniTableRowsForElement.slice(startIndex, endIndex);

      return res.json({
        success: true,
        miniTable: paginatedData,
        totalItems,
        page,
        pageSize,
      });

    } catch (error) {
      console.error('[TableController] Error in getSJSMiniTableData:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get SJS mini table data',
        error: error.message,
      });
    }
  }



  // Get QC table data by file ID
  static async getTableDataByFile(req, res) {
  try {
    const { file_id, start_date, end_date } = req.query;

    if (!file_id && !(start_date && end_date)) {
      return res.status(400).json({
        success: false,
        message: 'A file_id or a start_date and end_date range is required'
      });
    }


    let result;
    
    if (file_id) {
      result = await tableService.getQCTableData(parseInt(file_id, 10));
    } 
    else if (start_date && end_date) {
      const sd= start_date.split('T')[0];
      const ed= end_date.split('T')[0];
      result = await tableService.getFinalQCTableData(sd,ed);
    }

    if (!result || !result.tableData || result.tableData.length === 0) {
      return res.json({
        success: true,
        message: result ? result.message : 'No data found for the selected criteria',
        tableData: [],
        elements: []
      });
    }

    res.json({
      success: true,
      tableData: result.tableData,
      elements: result.elements
    });

  } catch (error) {
    console.error('[TableController] Error fetching QC table data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch QC table data',
      error: error.message
    });
  }
}

    static async getSJSTableDataByFile(req, res) {

  try {
    const { file_id, start_date, end_date } = req.query;


    if (!file_id && !(start_date && end_date)) {
      return res.status(400).json({
        success: false,
        message: 'A file_id or a start_date and end_date range is required'
      });
    }



    let result;

    if (file_id) {
      const solutionLabel = 'SJS-Std';
      result = await tableService.getSJSTableData(parseInt(file_id, 10), solutionLabel);
    } else if (start_date && end_date) {
      
      result = await tableService.getFinalSJSTableData(start_date, end_date);
      console.log('Result for SJS Table Data by Date Range:', result);
    }

    if (!result || !result.tableData || result.tableData.length === 0) {
      return res.json({
        success: true,
        message: result ? result.message : 'No data found for the selected criteria',
        tableData: [],
        elements: []
      });
    }

    return res.json({
      success: true,
      tableData: result.tableData,
      elements: result.elements
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

}

module.exports = TableController;