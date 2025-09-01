const TableModel = require('../models/tableModel');
const fileModel = require('../models/fileModel');
const { TEconc, MEconc } = require('../colHeaders');
const TableService = require('./tableService');


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
  

  // static async calculateSummaryStats(avgRow, rsdRow, solutionLabel) {
  //   const { tableData } = this.generateQCTableRowsFromData(avgRow, rsdRow, solutionLabel);
  
  //   let totalRSD = 0;
  //   let rsdCount = 0;
  //   let totalError = 0;
  //   let errorCount = 0;
  
  //   for (const row of tableData) {
  //     if (typeof row.rsd === 'number' && !isNaN(row.rsd)) {
  //       totalRSD += row.rsd;
  //       rsdCount++;
  //     }
  //     if (typeof row.errorPercentage === 'number' && !isNaN(row.errorPercentage)) {
  //       totalError += row.errorPercentage;
  //       errorCount++;
  //     }
  //   }
  
  //   return {
  //     totalElements: tableData.length,
  //     elementsWithinTolerance: tableData.filter(r => r.isWithinTolerance).length,
  //     averageRSD: rsdCount > 0 ? +(totalRSD / rsdCount).toFixed(2) : 0,
  //     averageErrorPercentage: errorCount > 0 ? +(totalError / errorCount).toFixed(2) : 0
  //   };
  // }
  

  static async getSummaryForQC(fileId, solutionLabel) {
    const fileType = await fileModel.getTypeById(fileId);
    const elementColumns = fileType === 2 ? TEconc : MEconc;
  
    const { avgRow, rsdRow } = await TableModel.getAvgAndRsdRows(fileId, solutionLabel, elementColumns);
  
    const match = solutionLabel.match(/[\d.]+/);
    const errorFactor = match ? parseFloat(match[0]) : 1;
  
    // Generate QC table rows
    const { tableData } = TableService.generateQCTableRowsFromData(avgRow, rsdRow, solutionLabel);
  
    const totalElements = tableData.length;
    const elementsNotWithinTolerance = tableData.filter(r => r.isNotWithinTolerance).length;
    const elementsWithinTolerance = totalElements - elementsNotWithinTolerance;
  
    const averageRSD = tableData.length > 0
      ? +(tableData.reduce((sum, r) => sum + (r.rsd || 0), 0) / tableData.length).toFixed(2)
      : 0;
  
    const averageErrorPercentage = tableData.length > 0
      ? +(tableData.reduce((sum, r) => sum + (r.errorPercentage || 0), 0) / tableData.length).toFixed(2)
      : 0;
  
    // 🟩 Add failed elements list:
    const failedElements = tableData
      .filter(r => r.isWithinTolerance === false)
      .map(r => r.fullElementName); // or use r.fullElementName for detailed label

    return {
      totalElements,
      elementsNotWithinTolerance,
      elementsWithinTolerance,

      averageRSD,
      averageErrorPercentage,
      failedElements
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
  
      const solutionLabel1 = "QC MES 5 ppm";
      const solutionLabel2 = "QC MES 50 ppb";
  
      const { tableData: data1 } = TableService.generateQCTableRowsFromData(avgRow1, rsdRow1, solutionLabel1);
      const { tableData: data2 } = TableService.generateQCTableRowsFromData(avgRow2, rsdRow2, solutionLabel2);
  
      const totalElements = data1.length + data2.length;
      const elementsNotWithinTolerance = 
        data1.filter(r => r.isNotWithinTolerance).length + data2.filter(r => r.isNotWithinTolerance).length;
  
      const averageRSD = totalElements > 0
        ? +(
            (data1.reduce((sum, r) => sum + (r.rsd || 0), 0) + data2.reduce((sum, r) => sum + (r.rsd || 0), 0))
            / totalElements
          ).toFixed(2)
        : 0;
  
      const averageErrorPercentage = totalElements > 0
        ? +(
            (data1.reduce((sum, r) => sum + (r.errorPercentage || 0), 0) + data2.reduce((sum, r) => sum + (r.errorPercentage || 0), 0))
            / totalElements
          ).toFixed(2)
        : 0;
  
      return {
        totalElements,
        elementsNotWithinTolerance,
        averageRSD,
        averageErrorPercentage
      };
    } catch (err) {
      console.error("Error in getSummaryForQCByDates:", err);
      throw err;
    }
  }
  


}



module.exports = QcCheckService;
