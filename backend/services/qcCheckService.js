const TableModel = require('../models/tableModel');
const fileModel = require('../models/fileModel');
const { TEconc, MEconc } = require('../colHeaders');

class QcCheckService {
  static async getSolutionLabelsForFile(fileId) {
    return new Promise(async (resolve, reject) => {
      try {
        const fileType = await fileModel.getTypeById(fileId);
  
        let qclabel;
        if (fileType === 1) {
          qclabel = "QC MES 5 ppm";
        } else if (fileType === 2) {
          qclabel = "QC MES 50 ppb";
        }
  
        resolve(qclabel || null);
      } catch (err) {
        reject(err);
      }
    });
  }
  
  static async getSummaryForQC(fileId, solutionLabel) {
  const fileType = await fileModel.getTypeById(fileId);
  const elementColumns = fileType === 2 ? TEconc : MEconc;

  // Fetch avg and rsd rows from your updated model function
  const { avgRow, rsdRow } = await TableModel.getAvgAndRsdRows(fileId, solutionLabel, elementColumns);

  const match = solutionLabel.match(/[\d.]+/);
  const errorFactor = match ? parseFloat(match[0]) : 1;

  const totalElements = elementColumns.reduce((count, col) => {
    return count + (avgRow[col] !== null && avgRow[col] !== undefined ? 1 : 0);
  }, 0);

  let elementsWithinTolerance = 0;
  let totalRSD = 0;
  let rsdCount = 0;
  let totalError = 0;
  let errorCount = 0;

  for (const col of elementColumns) {
    const avg = avgRow[col];
    const rsd = rsdRow[col];

    if (avg === null || avg === undefined) continue;

    const errorPercent = errorFactor !== 0
      ? Math.abs(avg - errorFactor) / errorFactor * 100
      : 0;

    if (rsd !== null && rsd !== undefined && !isNaN(rsd)) {
      totalRSD += rsd;
      rsdCount++;
    }

    if (!isNaN(errorPercent)) {
      totalError += errorPercent;
      errorCount++;
    }

    if (errorPercent <= 10) {
      elementsWithinTolerance++;
    }
  }

  return {
    totalElements,
    elementsWithinTolerance,
    averageRSD: rsdCount > 0 ? +(totalRSD / rsdCount).toFixed(2) : 0,
    averageErrorPercentage: errorCount > 0 ? +(totalError / errorCount).toFixed(2) : 0
  };
}

}

module.exports = QcCheckService;
