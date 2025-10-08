// controllers/graphController.js
const graphModel = require('../models/graphModel');
const QcGraphService = require('../services/qcGraphService');

/**
 * Get available QC elements
 * Supports fetching by file_id or by date range
 */
exports.getElements = async (req, res) => {
  const { file_id, start_date, end_date } = req.query;
  const { isAdmin, orgId } = req.rbac;   // RBAC context

  if (!file_id && (!start_date || !end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: provide either file_id or start_date & end_date',
    });
  }

  try {
    let elements;

    if (file_id) {
      elements = await QcGraphService.getElementsbyfile(file_id, isAdmin, orgId);
    } else {
      elements = await QcGraphService.getElementsbydate(start_date, end_date, isAdmin, orgId);
    }

    res.json({ success: true, elements });
  } catch (error) {
    console.error('Error in graphController.getElements:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get QC graph data
 * Supports fetching by file_id or by date range
 */
exports.getGraphData = async (req, res) => {
  const { file_id, start_date, end_date, element } = req.query;
  const { isAdmin, orgId } = req.rbac;   // RBAC context

  if (!file_id && (!start_date || !end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: provide either file_id or start_date & end_date',
    });
  }

  try {
    let result;

    if (file_id) {
      result = await QcGraphService.fetchGraphDataByFileId(file_id, element, isAdmin, orgId);
    } else {
      result = await QcGraphService.fetchGraphDataByDateRange(start_date, end_date, element, isAdmin, orgId);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in graphController.getGraphData:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get SJS graph data
 * Supports fetching by file_id or by date range
 */
exports.getSJSGraphData = async (req, res) => {
  const { file_id, start_date, end_date } = req.query;
  const { isAdmin, orgId } = req.rbac;   // RBAC context

  if (!file_id && (!start_date || !end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Missing file_id or date range',
    });
  }

  try {
    let result;

    if (start_date && end_date) {
      result = await graphModel.fetchSJSGraphDataByDateRange(start_date, end_date, isAdmin, orgId);
    } else if (file_id) {
      result = await graphModel.fetchSJSGraphDataByFileId(file_id, isAdmin, orgId);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in graphController.getSJSGraphData:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
