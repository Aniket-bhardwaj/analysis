const ElementService = require('../services/elementService');
const { MEconc, TEconc } = require('../colHeaders');

class ElementController {
  static async getElementInspectorData(req, res) {
  try {
    const { element, file_id, start_date, end_date } = req.query;

    // Pass everything to a single service method:
    const graphData = await ElementService.fetchElementData(element, {
      file_id,
      start_date,
      end_date
    });

    res.json({ graphData });
  } catch (error) {
    console.error('Error in getElementInspectorData:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
  

  static async getElementOptions(req, res) {
    try {
      const allElements = [...MEconc, ...TEconc];
      res.json({ elements: allElements });
    } catch (err) {
      console.error('Error in getElementOptions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = ElementController;
