const graphModel = require('../models/graphModel');

exports.getGraphData = async (req, res) => {
  const { file_id, start_date, end_date } = req.query;

  if (!file_id && (!start_date || !end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: provide either file_id or start_date & end_date',
    });
  }

  try {
    let result;

    if (file_id) {
      result = await graphModel.fetchGraphDataByFileId(file_id);
    } else {
      result = await graphModel.fetchGraphDataByDateRange(start_date, end_date);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in graphController:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSJSGraphData = async (req, res) => {
  const { file_id, start_date, end_date } = req.query;

  if (!file_id && (!start_date || !end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Missing file_id or date range',
    });
  }

  try {
    let result;

    // ✅ Give priority to date range over file_id
    if (start_date && end_date) {
      result = await graphModel.fetchSJSGraphDataByDateRange(start_date, end_date);
    } else if (file_id) {
      result = await graphModel.fetchSJSGraphDataByFileId(file_id);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in getSJSGraphData:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
