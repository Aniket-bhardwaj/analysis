const sampleService = require('../services/sampleService');

exports.getSampleElementDetails = async (req, res) => {
  try {
    const { sampleId, elementName } = req.body;
    const result = await sampleService.getSampleElementDetails(sampleId, elementName);
    res.json(result);
  } catch (error) {
    console.error('Controller Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
