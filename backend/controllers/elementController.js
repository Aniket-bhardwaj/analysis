const ElementService = require('../services/elementService');
const { MEconc, TEconc } = require('../colHeaders');

class ElementController {
  static async getElementInspectorData(req, res) {
    try {
      const { element, file_id, start_date, end_date } = req.query;
      const { isAdmin, orgId } = req.rbac || {};

      const graphData = await ElementService.fetchElementData(
        element,
        { file_id, start_date, end_date },
        { isAdmin, orgId }
      );

      res.json({ graphData });
    } catch (error) {
      console.error('Error in getElementInspectorData:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getElementOptions(req, res) {
    try {
      const { isAdmin, orgId } = req.rbac || {};


      const allElements = await ElementService.getAllElementNames({
        isAdmin: isAdmin ? 1 : 0,
        orgId
      });

      res.json({ elements: allElements });
    } catch (err) {
      console.error('Error in getElementOptions:', err);
 
      res.json({ elements: [...MEconc, ...TEconc] });
    }
  }
}

module.exports = ElementController;
