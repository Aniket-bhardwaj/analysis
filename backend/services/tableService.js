const TableModel = require('../models/tableModel');
const fileModel = require('../models/fileModel');
const { MEconc, TEconc , OMstdcleaned,OTstdcleaned } = require('../colHeaders');

class TableService {
  static async getQCTableData(fileId, solutionLabel) {
  // Step 1: Determine file type
  const csvType = await fileModel.getTypeById(fileId);

  // Step 2: Decide which columns to use
  const elementColumns = csvType === 1 ? MEconc : TEconc;

  // Step 3: Get rows for selected columns
  const rows = await TableModel.getRawQCTableRows(fileId, solutionLabel, elementColumns);

  if (!rows || rows.length === 0) {
    return {
      tableData: [],
      elements: [],
      solutionLabel
    };
  }

  // Step 4: Get error factor from solution label
  const match = solutionLabel.match(/[\d.]+/);
  const errorFactor = match ? parseFloat(match[0]) : null;

  // Step 5: Calculate final table
  const tableData = elementColumns.map((col) => {
    const values = rows.map(r => parseFloat(r[col])).filter(v => !isNaN(v));

    if (values.length === 0) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + (val - avg) ** 2, 0) / values.length);
    const rsd = avg !== 0 ? (stdDev / avg) * 100 : 0;

    const errorPercentage = errorFactor
      ? values.reduce((sum, val) => sum + (Math.abs(val - errorFactor) / errorFactor) * 100, 0) / values.length
      : null;

    const errorTolerance = 10;
    const isWithinTolerance = errorPercentage !== null ? errorPercentage <= errorTolerance : null;

    return {
      element: col.replace(/[_-].*$/, ''),
      valueAvg: +avg.toFixed(3),
      correctedValueAvg: +avg.toFixed(3),  // now same as valueAvg
      rsd: +rsd.toFixed(2),
      errorPercentage: errorPercentage !== null ? +errorPercentage.toFixed(2) : null,
      errorFactor,
      isWithinTolerance,
      distributionData: values.sort((a, b) => a - b)
    };
  }).filter(Boolean);

  return {
    tableData,
    elements: elementColumns,
    solutionLabel
  };
}


static async getSJSTableData(fileId, solutionLabel) {
  // Step 1: Determine file type
  const csvType = await fileModel.getTypeById(fileId);

  // Step 2: Decide which columns to use
  const elementColumns = csvType === 1 ? OMstdcleaned : OTstdcleaned;

  // Step 3: Get rows for selected columns
  const rows = await TableModel.getRawQCTableRows(fileId, solutionLabel, elementColumns);

  if (!rows || rows.length === 0) {
    return {
      tableData: [],
      elements: [],
      solutionLabel
    };
  }

  // Step 4: Get SJS-Std and Error rows (only selected columns)
  const [sjsStdRow, errorRow] = await TableModel.getSJSRows(elementColumns);

  // Step 5: Calculate final table using SJS logic
  const tableData = elementColumns.map((col) => {
    const values = rows.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
    if (values.length === 0) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + (val - avg) ** 2, 0) / values.length);
    const rsd = avg !== 0 ? (stdDev / avg) * 100 : 0;

    const sjsStd = parseFloat(sjsStdRow[col]);
    const errorVal = parseFloat(errorRow[col]);

    const sjsValid = !isNaN(sjsStd) && !isNaN(errorVal) && sjsStd !== 0;

    const errorAllowedPercent = sjsValid ? (errorVal / sjsStd) * 100 : null;
    const actualErrorPercent = sjsValid ? (Math.abs(avg - sjsStd) / sjsStd) * 100 : null;
    const isWithinTolerance = sjsValid ? actualErrorPercent <= errorAllowedPercent : null;

    return {
      element: col,
      valueAvg: +avg.toFixed(3),
      sjsStd: sjsValid ? +sjsStd.toFixed(3) : null,
      errorAllowedPercent: sjsValid ? +errorAllowedPercent.toFixed(2) : null,
      actualErrorPercent: sjsValid ? +actualErrorPercent.toFixed(2) : null,
      isWithinTolerance,
      rsd: +rsd.toFixed(2),
      distributionData: values.sort((a, b) => a - b)
    };
  }).filter(Boolean);

  return {
    tableData,
    elements: elementColumns,
    solutionLabel
  };
}

}

module.exports = TableService;
