const ElementModel = require('../models/elementModel');
const { MEconc, TEconc } = require('../colHeaders');

class ElementService {
  // Return list of all element names (without "_Corrected")
  static getAllElementNames() {
    return [...new Set([...MEconc, ...TEconc])];
  }

  static async fetchElementData(elementName) {
    try {
      const correctedElementName = `${elementName}_Corrected`;

      const results = await ElementModel.getElementCorrectedValues(correctedElementName);

      const labels = results.map(row => row.sample_name);
      const values = results.map(row => row.value);

      // console.log('Labels:', labels);
      // console.log('Values:', values);

      return {
        labels,
        data: values
      };
    } catch (err) {
      console.error('Error in ElementService.fetchElementData:', err);
      throw err;
    }
  }
}

module.exports = ElementService;
