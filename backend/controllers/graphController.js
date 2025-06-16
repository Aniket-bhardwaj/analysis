const graphModel = require('../models/graphModel');

exports.getGraphData = async (req, res) => {
  const { file_id, solution_label } = req.query;

  if (!file_id || !solution_label) {
    return res.status(400).json({ success: false, message: 'Missing file_id or solution_label' });
  }

  try {
    const result = await graphModel.fetchGraphData(file_id);
    res.json(result);
  } catch (error) {
    console.error('Error in graphController:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
