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
  

  static async calculateSummaryStats(avgRow, rsdRow, errorFactor) {
  let totalElements = 0;
  let elementsWithinTolerance = 0;
  let totalRSD = 0;
  let rsdCount = 0;
  let totalError = 0;
  let errorCount = 0;

  for (const col of Object.keys(avgRow)) {
    const avg = avgRow[col];
    const rsd = rsdRow[col];

    if (typeof avg === 'number' && avg > 0) {
      totalElements++;

      const errorPercent = Math.abs(avg - errorFactor) / errorFactor * 100;

      if (!isNaN(errorPercent)) {
        totalError += errorPercent;
        errorCount++;
      }

      if (errorPercent <= 10) {
        elementsWithinTolerance++;
      }
    }

    if (typeof rsd === 'number' && !isNaN(rsd)) {
      totalRSD += rsd;
      rsdCount++;
    }
  }

  return {
    totalElements,
    elementsWithinTolerance,
    averageRSD: rsdCount > 0 ? +(totalRSD / rsdCount).toFixed(2) : 0,
    averageErrorPercentage: errorCount > 0 ? +(totalError / errorCount).toFixed(2) : 0
  };
}

  static async getSummaryForQC(fileId, solutionLabel) {
  const fileType = await fileModel.getTypeById(fileId);
  const elementColumns = fileType === 2 ? TEconc : MEconc;

  const { avgRow, rsdRow } = await TableModel.getAvgAndRsdRows(fileId, solutionLabel, elementColumns);

  const match = solutionLabel.match(/[\d.]+/);
  const errorFactor = match ? parseFloat(match[0]) : 1;

  const { totalElements, elementsWithinTolerance, averageRSD, averageErrorPercentage } =
    await this.calculateSummaryStats(avgRow, rsdRow, errorFactor);
  
    

  return {
    totalElements,
    elementsWithinTolerance,
    averageRSD,
    averageErrorPercentage
  };
}


static async getSummaryForQCByDates(startDate, endDate) {
  try {
    const { avgRow: avgRow1, rsdRow: rsdRow1 } = await TableModel.getQCDataWithDateRange(
      startDate, endDate, MEconc
    );

    const { avgRow: avgRow2, rsdRow: rsdRow2 } = await TableModel.getQCDataWithDateRange(
      startDate, endDate, TEconc
    );

    const result1 = await this.calculateSummaryStats(avgRow1, rsdRow1, 5);   // Type 1
    const result2 = await this.calculateSummaryStats(avgRow2, rsdRow2, 50);  // Type 2

    const totalElements = result1.totalElements + result2.totalElements;
    const elementsWithinTolerance = result1.elementsWithinTolerance + result2.elementsWithinTolerance;

    const weightedRSD = totalElements > 0
      ? ((result1.averageRSD * result1.totalElements) + (result2.averageRSD * result2.totalElements)) / totalElements
      : 0;

    const weightedError = totalElements > 0
      ? ((result1.averageErrorPercentage * result1.totalElements) + (result2.averageErrorPercentage * result2.totalElements)) / totalElements
      : 0;
    console.log(
  totalElements,
  elementsWithinTolerance,
  weightedRSD,
  weightedError
);


    return {
      totalElements,
      elementsWithinTolerance,
      averageRSD: +weightedRSD.toFixed(2),
      averageErrorPercentage: +weightedError.toFixed(2)
    };
  } catch (err) {
    console.error("Error in getSummaryForQCByDates:", err);
    throw err;
  }
}


}



module.exports = QcCheckService;
