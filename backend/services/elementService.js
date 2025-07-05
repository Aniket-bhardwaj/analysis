const ElementModel = require('../models/elementModel');
const SampleModel = require('../models/sampleModel');
const { MEconc, TEconc } = require('../colHeaders');

const qclMap = {
  1: "QC MES 5 ppm",
  2: "QC MES 50 ppb"
};

const concMap = {
  1: MEconc,
  2: TEconc
};

class ElementService {
  static getAllElementNames() {
    return [...new Set([...MEconc, ...TEconc])];
  }

  // services/ElementService.js
static async fetchElementData(
  elementName,
  { file_id = null, start_date = null, end_date = null } = {}
) {
  try {
    const correctedElement = `${elementName}_Corrected`;

    // Pass the filter options down to the model
    const rawRows = await ElementModel.getElementCorrectedValuesDetailed(
      correctedElement,
      { file_id, start_date, end_date }
    );

    const result = [];

    for (const row of rawRows) {
      const { sample_name, value, type, file_id: rowFileId } = row;
      const qcl = qclMap[type];
      const elementList = concMap[type];

      if (!qcl || !elementList.includes(elementName)) continue;

      const avgRow = await SampleModel.getAvg(rowFileId, qcl, [elementName]);
      const avg = avgRow[elementName];

      let status = '-';
      let error  = null;

      if (avg != null) {
        const target = type === 1 ? 5 : 50;
        const lower  = target * 0.9;
        const upper  = target * 1.1;
        status = avg >= lower && avg <= upper ? 'Pass' : 'Fail';
        error  = ((Math.abs(avg - target) / target) * 100).toFixed(2);
      }

      result.push({
        sample: sample_name,
        value,
        status,
        error
      });
    }

    return result;
  } catch (err) {
    console.error('Error in fetchElementData:', err);
    throw err;
  }
}
  
}

module.exports = ElementService;
