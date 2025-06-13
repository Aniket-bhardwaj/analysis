const graphModel = require('../models/graphModel');

exports.getGraphData = async (req, res) => {
  const { id } = req.params;
  console.log('Controller received fileId:', id);


  try {
    const graphData = await graphModel.fetchGraphData(parseInt(id));
    res.json(graphData);
  } catch (err) {
    console.error('Error fetching graph data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};