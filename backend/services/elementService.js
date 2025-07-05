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

  static async fetchElementData(elementName) {
    try {
      const correctedElement = `${elementName}_Corrected`;
      const rawRows = await ElementModel.getElementCorrectedValuesDetailed(correctedElement);
  
      const result = [];
  
      for (const row of rawRows) {
        const { sample_name, value, type, file_id } = row;
        const qcl = qclMap[type];
        const elementList = concMap[type];
  
        if (!qcl || !elementList.includes(elementName)) continue;
  
        const avgRow = await SampleModel.getAvg(file_id, qcl, [elementName]);
        const avg = avgRow[elementName];
  
        let error = null;
        let status = '-';
  
        if (avg != null) {
          // ✅ Use fixed target (5 or 50) depending on type
          const target = type === 1 ? 5 : 50;
          const lower = target * 0.9;
          const upper = target * 1.1;
  
          status = avg >= lower && avg <= upper ? 'Pass' : 'Fail';
  
        }
  
        result.push({
          sample: sample_name,
          value,
          status,
          error: error?.toFixed(2) || null
        });
      }
      // console.log('result:' ,result);
  
      return result;
  
    } catch (err) {
      console.error('Error in fetchElementData:', err);
      throw err;
    }
  }
  
}

module.exports = ElementService;
