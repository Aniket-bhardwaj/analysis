const TableModel = require('../models/tableModel');
const fileModel = require('../models/fileModel');
const { MEconc, TEconc , OMstdcleaned,OTstdcleaned } = require('../colHeaders');
const qcl = {
  1: 'QC MES 5 ppm',
  2: 'QC MES 50 ppb',
};

class TableService {
static generateQCTableRowsFromData(avgRow, rsdRow, solutionLabel) {
  if (!avgRow || Object.keys(avgRow).length === 0) {
    return {
      tableData: [],
      elements: []
    };
  }

  const TOLERANCE = 10; // ±10% error allowed
  const elementColumns = Object.keys(avgRow);
  const errorFactor = parseFloat(solutionLabel.match(/[\d.]+/)[0]);

  const tableData = elementColumns.map((col) => {
    const avg = avgRow[col];
    const rsd = rsdRow ? rsdRow[col] : null;

    const errorPercentage = avg !== null
      ? (Math.abs(avg - errorFactor) / errorFactor) * 100
      : null;

    const isWithinTolerance = errorPercentage !== null ? errorPercentage <= TOLERANCE : null;

    return {
      element: col.replace(/[_-].*$/, ''),
      valueAvg: avg !== null ? +avg.toFixed(3) : null,
      correctedValueAvg: avg !== null ? +avg.toFixed(3) : null,
      rsd: rsd !== null && rsd !== undefined ? +rsd.toFixed(2) : null,
      errorPercentage: errorPercentage !== null ? +errorPercentage.toFixed(2) : null,
      errorFactor,
      isWithinTolerance,
      distributionData: []
    };
  });

  return { tableData, elements: elementColumns };
}


static async getQCTableData(fileId) {
  const csvType = await fileModel.getTypeById(fileId);
  const solutionLabel = qcl[csvType];
  const elementColumns = csvType === 1 ? MEconc : TEconc;

  const { avgRow, rsdRow } = await TableModel.getAvgAndRsdRows(fileId, solutionLabel, elementColumns);

  return this.generateQCTableRowsFromData(avgRow, rsdRow, solutionLabel);
}


static async getFinalQCTableData(startDate, endDate) {
  try {
    const { avgRow: avgRow1, rsdRow: rsdRow1 } = await TableModel.getQCDataWithDateRange(
      startDate, endDate, MEconc
    );

    const { avgRow: avgRow2, rsdRow: rsdRow2 } = await TableModel.getQCDataWithDateRange(
      startDate, endDate, TEconc
    );

    const result1 = this.generateQCTableRowsFromData(avgRow1, rsdRow1, qcl[1]);
    const result2 = this.generateQCTableRowsFromData(avgRow2, rsdRow2, qcl[2]);

    return {
      tableData: [...result1.tableData, ...result2.tableData],
      elements: [...result1.elements, ...result2.elements]
    };
  } catch (err) {
    console.error("Error in getFinalQCTableData:", err);
    throw err;
  }
}



static generateSJSTableFromRows(avgRow, rsdRow, sjsStdRow, errorRow) {
  if (!avgRow || Object.keys(avgRow).length === 0) {
    return {
      tableData: [],
      elements: []
    };
  }

  const elementColumns = Object.keys(avgRow);

  const tableData = elementColumns.map((col) => {
    const avg = avgRow[col];
    const rsd = rsdRow ? rsdRow[col] : null;

    const sjsStd = parseFloat(sjsStdRow[col]);
    const errorVal = parseFloat(errorRow[col]);
    const sjsValid = !isNaN(sjsStd) && !isNaN(errorVal) && sjsStd !== 0 && avg !== null && avg !== undefined;

    const errorAllowedPercent = sjsValid ? (errorVal / sjsStd) * 100 : null;
    const actualErrorPercent = sjsValid ? (Math.abs(avg - sjsStd) / sjsStd) * 100 : null;
    const isWithinTolerance = sjsValid ? actualErrorPercent <= errorAllowedPercent : null;

    return {
      element: col,
      valueAvg: avg !== null && avg !== undefined ? +avg.toFixed(3) : null,
      sjsStd: !isNaN(sjsStd) ? +sjsStd.toFixed(3) : null,
      errorAllowedPercent: errorAllowedPercent !== null ? +errorAllowedPercent.toFixed(2) : null,
      actualErrorPercent: actualErrorPercent !== null ? +actualErrorPercent.toFixed(2) : null,
      isWithinTolerance,
      rsd: rsd !== null && rsd !== undefined ? +rsd.toFixed(2) : null,
      distributionData: []
    };
  });

  return {
    tableData,
    elements: elementColumns
  };
}



static async getSJSTableData(fileId) {
  try {
    const csvType = await fileModel.getTypeById(fileId);
    const elementColumns = csvType === 1 ? OMstdcleaned : OTstdcleaned;
    const solutionLabel = 'SJS-Std';
//     console.log("🧪 CSV Type:", csvType);
// console.log("🧪 elementColumns:", elementColumns, "Is array?", Array.isArray(elementColumns));

    const {avgRow , rsdRow} = await TableModel.getAvgAndRsdRows(fileId, solutionLabel,elementColumns,);

    const [sjsStdRow, errorRow] = await TableModel.getSJSRows(elementColumns);
    return this.generateSJSTableFromRows(avgRow, rsdRow, sjsStdRow, errorRow);
  } catch (err) {
    console.error("Error in getSJSTableData:", err);
    throw err;
  }
}
static async getFinalSJSTableData(startDate, endDate) {
  try {
    // Step 1: Get files with id and type
    const solutionlabel = 'SJS-Std';
    const combined = [...OMstdcleaned, ...OTstdcleaned];

    const {avgRow,rsdRow} = await TableModel.getQCDataWithDateRange(startDate, endDate,combined,solutionlabel);


    // Step 2: Separate into type1 and type2 ID arrays
    const [sjsStdRow, errorRow] = await TableModel.getSJSRows(combined);

    return this.generateSJSTableFromRows(avgRow, rsdRow, sjsStdRow, errorRow);
  } catch (err) {
    console.error("Error in getSJSTableData:", err);
    throw err;
  }
}

}

module.exports = TableService;
