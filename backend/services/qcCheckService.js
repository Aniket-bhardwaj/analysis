const TableModel = require('../models/tableModel');
const fileModel = require('../models/fileModel');
const { TEconc, MEconc } = require('../colHeaders');
const TableService = require('./tableService');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database.sqlite'));

class QcCheckService {
  /**
   * Get solution label string for file type
   */
  static async getSolutionLabelsForFile(fileId, isAdmin, orgId) {
    try {
      const fileMeta = await fileModel.getFileMetadata(fileId, isAdmin, orgId);
      if (!fileMeta) {
        throw new Error(`File ${fileId} not found or not accessible for this organization.`);
      }
      let qclabel;
      if (fileMeta.type === 1) {
        qclabel = "QC MES 5 ppm";
      } else if (fileMeta.type === 2) {
        qclabel = "QC MES 50 ppb";
      }
      return qclabel || null;
    } catch (err) {
      console.error("[QcCheckService] getSolutionLabelsForFile error:", err.message);
      throw err;
    }
  }

  /**
   * Compute QC summary for a single file and persist results
   */
  static async getSummaryForQC(fileId, solutionLabel, isAdmin, orgId) {
    const fileType = await fileModel.getTypeById(fileId, isAdmin, orgId);
    const elementColumns = fileType === 2 ? TEconc : MEconc;

    // --- calculate avg + RSD rows
    const { avgRow, rsdRow } = await TableModel.getAvgAndRsdRows(
      fileId,
      solutionLabel,
      elementColumns,
      isAdmin,
      orgId
    );

    // --- generate QC table rows
    const { tableData } = TableService.generateQCTableRowsFromData(
      avgRow,
      rsdRow,
      solutionLabel
    );

    

    // --- summaries (for frontend response)
    const totalElements = tableData.length;
    const elementsNotWithinTolerance = tableData.filter(r => r.isNotWithinTolerance).length;
    const elementsWithinTolerance = totalElements - elementsNotWithinTolerance;

    const averageRSD = totalElements > 0
      ? +(tableData.reduce((sum, r) => sum + (r.rsd || 0), 0) / totalElements).toFixed(2)
      : 0;

    const averageErrorPercentage = totalElements > 0
      ? +(tableData.reduce((sum, r) => sum + (r.errorPercentage || 0), 0) / totalElements).toFixed(2)
      : 0;

    const failedElements = tableData
      .filter(r => r.isWithinTolerance === false)
      .map(r => r.fullElementName);

    return {
      totalElements,
      elementsNotWithinTolerance,
      elementsWithinTolerance,
      averageRSD,
      averageErrorPercentage,
      failedElements
    };
  }

  /**
   * Compute QC summary across all files in a date range
   */
  static async getSummaryForQCByDates(startDate, endDate, isAdmin, orgId) {
    try {
      const { avgRow: avgRow1, rsdRow: rsdRow1 } = await TableModel.getQCDataWithDateRange(
        startDate, endDate, MEconc, isAdmin, orgId
      );
      const { avgRow: avgRow2, rsdRow: rsdRow2 } = await TableModel.getQCDataWithDateRange(
        startDate, endDate, TEconc, isAdmin, orgId
      );

      const solutionLabel1 = "QC MES 5 ppm";
      const solutionLabel2 = "QC MES 50 ppb";

      const { tableData: data1 } = TableService.generateQCTableRowsFromData(avgRow1, rsdRow1, solutionLabel1);
      const { tableData: data2 } = TableService.generateQCTableRowsFromData(avgRow2, rsdRow2, solutionLabel2);

      const totalElements =
  data1.filter(row => row.valueAvg !== null).length +
  data2.filter(row => row.valueAvg !== null).length;


      const elementsNotWithinTolerance =
        data1.filter(r => r.isNotWithinTolerance).length +
        data2.filter(r => r.isNotWithinTolerance).length;

      const averageRSD = totalElements > 0
        ? +(
            (data1.reduce((sum, r) => sum + (r.rsd || 0), 0) +
             data2.reduce((sum, r) => sum + (r.rsd || 0), 0)) / totalElements
          ).toFixed(2)
        : 0;

      const averageErrorPercentage = totalElements > 0
        ? +(
            (data1.reduce((sum, r) => sum + (r.errorPercentage || 0), 0) +
             data2.reduce((sum, r) => sum + (r.errorPercentage || 0), 0)) / totalElements
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

// const TableModel = require('../models/tableModel');
// const fileModel = require('../models/fileModel');
// const { TEconc, MEconc } = require('../colHeaders');
// const TableService = require('./tableService');
// const sqlite3 = require('sqlite3').verbose();
// const path = require('path');
// const db = new sqlite3.Database(path.join(__dirname, '../database.sqlite'));


// class QcCheckService {
//   static async getSolutionLabelsForFile(fileId, isAdmin, orgId) {
//     try {
//       const fileMeta = await fileModel.getFileMetadata(fileId, isAdmin, orgId);
//       if (!fileMeta) {
//         throw new Error(`File ${fileId} not found or not accessible for this organization.`);
//       }
//       let qclabel;
//       if (fileMeta.type === 1) {
//         qclabel = "QC MES 5 ppm";
//       } else if (fileMeta.type === 2) {
//         qclabel = "QC MES 50 ppb";
//       }
//       return qclabel || null;
//     } catch (err) {
//       console.error("[QcCheckService] getSolutionLabelsForFile error:", err.message);
//       throw err;
//     }
//   }

//   static async getSummaryForQC(fileId, solutionLabel, isAdmin, orgId) {
//     const fileType = await fileModel.getTypeById(fileId, isAdmin, orgId);
//     const elementColumns = fileType === 2 ? TEconc : MEconc;

//     const { avgRow, rsdRow } = await TableModel.getAvgAndRsdRows(
//       fileId,
//       solutionLabel,
//       elementColumns,
//       isAdmin,
//       orgId
//     );

//     const { tableData } = TableService.generateQCTableRowsFromData(
//       avgRow,
//       rsdRow,
//       solutionLabel
//     );

//     // --- persist element rows into qc_data
//     for (const row of tableData) {
//       await new Promise((resolve, reject) => {
//         db.run(
//           `INSERT INTO qc_data
//             (file_id, element, fullElementName, valueAvg, correctedValueAvg,
//              rsd, errorPercentage, isWithinTolerance, isNotWithinTolerance,
//              errorFactor, "Solution Label")
//            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           [
//             fileId,
//             row.element,
//             row.fullElementName,
//             row.valueAvg,
//             row.correctedValueAvg,
//             row.rsd,
//             row.errorPercentage,
//             row.isWithinTolerance ? 1 : 0,
//             row.isNotWithinTolerance ? 1 : 0,
//             row.errorFactor,
//             solutionLabel
//           ],
//           (err) => (err ? reject(err) : resolve())
//         );
//       });
//     }

//     // --- summaries
//     const totalElements = tableData.length;
//     const elementsNotWithinTolerance = tableData.filter(r => r.isNotWithinTolerance).length;
//     const elementsWithinTolerance = totalElements - elementsNotWithinTolerance;

//     const averageRSD = totalElements > 0
//       ? +(tableData.reduce((sum, r) => sum + (r.rsd || 0), 0) / totalElements).toFixed(2)
//       : 0;

//     const averageErrorPercentage = totalElements > 0
//       ? +(tableData.reduce((sum, r) => sum + (r.errorPercentage || 0), 0) / totalElements).toFixed(2)
//       : 0;

//     const failedElements = tableData
//       .filter(r => r.isWithinTolerance === false)
//       .map(r => r.fullElementName);

//     return {
//       totalElements,
//       elementsNotWithinTolerance,
//       elementsWithinTolerance,
//       averageRSD,
//       averageErrorPercentage,
//       failedElements,
//       tableData // 🔑 frontend now sees element data
//     };
//   }

//   static async getSummaryForQCByDates(startDate, endDate, isAdmin, orgId) {
//     try {
//       const { avgRow: avgRow1, rsdRow: rsdRow1 } = await TableModel.getQCDataWithDateRange(
//         startDate, endDate, MEconc, isAdmin, orgId
//       );
//       const { avgRow: avgRow2, rsdRow: rsdRow2 } = await TableModel.getQCDataWithDateRange(
//         startDate, endDate, TEconc, isAdmin, orgId
//       );

//       const solutionLabel1 = "QC MES 5 ppm";
//       const solutionLabel2 = "QC MES 50 ppb";

//       const { tableData: data1 } = TableService.generateQCTableRowsFromData(avgRow1, rsdRow1, solutionLabel1);
//       const { tableData: data2 } = TableService.generateQCTableRowsFromData(avgRow2, rsdRow2, solutionLabel2);

//       const totalElements = data1.length + data2.length;
//       const elementsNotWithinTolerance =
//         data1.filter(r => r.isNotWithinTolerance).length +
//         data2.filter(r => r.isNotWithinTolerance).length;

//       const averageRSD = totalElements > 0
//         ? +(
//             (data1.reduce((sum, r) => sum + (r.rsd || 0), 0) +
//              data2.reduce((sum, r) => sum + (r.rsd || 0), 0)) / totalElements
//           ).toFixed(2)
//         : 0;

//       const averageErrorPercentage = totalElements > 0
//         ? +(
//             (data1.reduce((sum, r) => sum + (r.errorPercentage || 0), 0) +
//              data2.reduce((sum, r) => sum + (r.errorPercentage || 0), 0)) / totalElements
//           ).toFixed(2)
//         : 0;

//       return {
//         totalElements,
//         elementsNotWithinTolerance,
//         averageRSD,
//         averageErrorPercentage
//       };
//     } catch (err) {
//       console.error("Error in getSummaryForQCByDates:", err);
//       throw err;
//     }
//   }
// }

// module.exports = QcCheckService;
