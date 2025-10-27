const TableModel = require("../models/tableModel");
const fileModel = require("../models/fileModel");
const { MEconc, TEconc, OMstdcleaned, OTstdcleaned } = require("../colHeaders");

const qcl = {
  1: "QC MES 5 ppm",
  2: "QC MES 50 ppb",
};

class TableService {
  static generateQCTableRowsFromData(avgRow, rsdRow, solutionLabel) {
    if (!avgRow || Object.keys(avgRow).length === 0) {
      return { tableData: [], elements: [] };
    }

    const TOLERANCE = 10;
    const elementColumns = Object.keys(avgRow);
    const errorFactor = parseFloat(solutionLabel.match(/[\d.]+/)[0]);

    const tableData = elementColumns.map((col) => {
      const avg = avgRow[col];
      const rsd = rsdRow ? rsdRow[col] : null;

      const errorPercentage =
        avg !== null ? (Math.abs(avg - errorFactor) / errorFactor) * 100 : null;

      const isWithinTolerance =
        errorPercentage !== null ? errorPercentage <= TOLERANCE : null;
      const isNotWithinTolerance =
        errorPercentage !== null ? errorPercentage > TOLERANCE : null;

      return {
        fullElementName: col,
        element: col.split(" ")[0],
        valueAvg: avg !== null ? +avg.toFixed(3) : null,
        correctedValueAvg: avg !== null ? +avg.toFixed(3) : null,
        rsd: rsd !== null && rsd !== undefined ? +rsd.toFixed(2) : null,
        errorPercentage:
          errorPercentage !== null ? +errorPercentage.toFixed(2) : null,
        errorFactor,
        isWithinTolerance,
        isNotWithinTolerance,
        distributionData: [],
      };
    });

    // Group rows by element
    const groupedData = {};
    tableData.forEach((row) => {
      if (!groupedData[row.element]) groupedData[row.element] = [];
      groupedData[row.element].push(row);
    });

    let finalData = [];
    for (const rows of Object.values(groupedData)) {
      if (rows.length === 1) {
        finalData.push(rows[0]);
      } else if (rows.length === 2) {
        const passRows = rows.filter((r) => r.isWithinTolerance);
        const failRows = rows.filter((r) => !r.isWithinTolerance);
        if (passRows.length === 2 || failRows.length === 2) {
          finalData = finalData.concat(rows);
        } else if (passRows.length === 1) {
          finalData.push(passRows[0]);
        } else {
          finalData = finalData.concat(rows);
        }
      } else {
        finalData = finalData.concat(rows);
      }
    }

    return {
      tableData: finalData,
      elements: Array.from(new Set(finalData.map((r) => r.fullElementName))),
    };
  }

  //  QC: untouched
  static async getQCTableData(fileId, isAdmin, orgId) {
    const csvType = await fileModel.getTypeById(fileId);
    const solutionLabel = qcl[csvType];
    const elementColumns = csvType === 1 ? MEconc : TEconc;

    const { avgRow, rsdRow } = await TableModel.getAvgAndRsdRows(
      fileId,
      solutionLabel,
      elementColumns,
      isAdmin,
      orgId
    );

    return this.generateQCTableRowsFromData(avgRow, rsdRow, solutionLabel);
  }

  static async getFinalQCTableData(startDate, endDate, isAdmin, orgId) {
    try {
      const { avgRow: avgRow1, rsdRow: rsdRow1 } =
        await TableModel.getQCDataWithDateRange(
          startDate,
          endDate,
          MEconc,
          isAdmin,
          orgId
        );

      const { avgRow: avgRow2, rsdRow: rsdRow2 } =
        await TableModel.getQCDataWithDateRange(
          startDate,
          endDate,
          TEconc,
          isAdmin,
          orgId
        );

      const result1 = this.generateQCTableRowsFromData(
        avgRow1,
        rsdRow1,
        qcl[1]
      );
      const result2 = this.generateQCTableRowsFromData(
        avgRow2,
        rsdRow2,
        qcl[2]
      );

      return {
        tableData: [...result1.tableData, ...result2.tableData],
        elements: [...result1.elements, ...result2.elements],
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
        elements: [],
      };
    }

    const elementColumns = Object.keys(avgRow);

    // Step 1: build initial rows
    const tableData = elementColumns.map((col) => {
      const cleanFullName = col.replace(/_Corrected$/, ""); // remove _Corrected
      const avg = avgRow[col];
      const rsd = rsdRow ? rsdRow[col] : null;
      const sjsStd = parseFloat(sjsStdRow[col]);
      const errorVal = parseFloat(errorRow[col]);
      const sjsValid =
        !isNaN(sjsStd) && !isNaN(errorVal) && sjsStd !== 0 && avg != null;

      const errorAllowedPercent = sjsValid ? 10 : null;
      const actualErrorPercent = sjsValid
        ? (Math.abs(avg - sjsStd) / sjsStd) * 100
        : null;
      const isWithinTolerance = sjsValid
        ? actualErrorPercent <= errorAllowedPercent
        : null;

      return {
        fullElementName: cleanFullName, // e.g. '45 Sc [ No Gas ] Conc. [ ppb ]'
        element: cleanFullName.split(" ")[0], // e.g. '45' or 'Al'
        valueAvg: avg != null ? +avg.toFixed(3) : null,
        sjsStd: !isNaN(sjsStd) ? +sjsStd.toFixed(3) : null,
        errorAllowedPercent:
          errorAllowedPercent != null ? +errorAllowedPercent.toFixed(2) : null,
        actualErrorPercent:
          actualErrorPercent != null ? +actualErrorPercent.toFixed(2) : null,
        isWithinTolerance,
        rsd: rsd != null ? +rsd.toFixed(2) : null,
        distributionData: [],
      };
    });

    // Step 2: group by short element name
    const grouped = {};
    for (const row of tableData) {
      if (!grouped[row.element]) grouped[row.element] = [];
      grouped[row.element].push(row);
    }

    // Step 3: filter based on pass/fail logic
    let finalData = [];
    for (const groupRows of Object.values(grouped)) {
      if (groupRows.length === 1) {
        finalData.push(groupRows[0]);
      } else if (groupRows.length === 2) {
        const passRows = groupRows.filter((r) => r.isWithinTolerance);
        const failRows = groupRows.filter((r) => r.isWithinTolerance === false);
        if (passRows.length === 2 || failRows.length === 2) {
          finalData = finalData.concat(groupRows); // keep both
        } else if (passRows.length === 1) {
          finalData.push(passRows[0]); // keep only the passing one
        } else {
          finalData = finalData.concat(groupRows); // fallback
        }
      } else {
        finalData = finalData.concat(groupRows); // unexpected case
      }
    }

    return {
      tableData: finalData,
      elements: Array.from(new Set(finalData.map((r) => r.fullElementName))),
    };
  }

  // static generateSJSTableFromRows(avgRow, rsdRow, sjsStdRow, errorRow) {
  //   if (!avgRow || Object.keys(avgRow).length === 0) {
  //     return { tableData: [], elements: [] };
  //   }

  //   const elementColumns = Object.keys(avgRow);

  //   const tableData = elementColumns.map((col) => {
  //     const cleanFullName = col.replace(/_Corrected$/, '');
  //     const avg = avgRow[col];
  //     const rsd = rsdRow ? rsdRow[col] : null;
  //     const sjsStd = parseFloat(sjsStdRow[col]);

  //     return {
  //       fullElementName: cleanFullName,
  //       element: cleanFullName.split(' ')[0],
  //       valueAvg: avg != null ? +avg.toFixed(3) : null,
  //       sjsStd: !isNaN(sjsStd) ? +sjsStd.toFixed(3) : null,

  //       // Use DB values (already populated by insertCorrected)
  //       error_pct: errorRow?.error_pct ?? null,
  //       tolerance_pct: errorRow?.tolerance_pct ?? null,
  //       rsd_pct: errorRow?.rsd_pct ?? null,
  //       status: errorRow?.status ?? null,

  //       // keep element-level RSD from avg/rsdRow
  //       rsd: rsd != null ? +rsd.toFixed(2) : null,

  //       distributionData: [],
  //     };
  //   });

  //   return {
  //     tableData,
  //     elements: Array.from(new Set(tableData.map((r) => r.fullElementName))),
  //   };
  // }

  //  patched to use fixed getSJSRows
  static async getSJSTableData(fileId, isAdmin, orgId) {
    try {
      const csvType = await fileModel.getTypeById(fileId);
      const season = await fileModel.getSeasonById(fileId);
      const elementColumns = csvType === 1 ? OMstdcleaned : OTstdcleaned;
      const solutionLabel = season === "post_basalt" ? "BHVO-2 STD" : "SJS-Std";

      const { avgRow, rsdRow } = await TableModel.getAvgAndRsdRows(
        fileId,
        solutionLabel,
        elementColumns,
        isAdmin,
        orgId
      );

      // Get the global standard and error rows

      let sjsStdRow, errorRow;

      if (season === "pre_basalt") {
        [sjsStdRow, errorRow] = await TableModel.getSJSRows(elementColumns);
      } else if (season === "post_basalt") {
        [sjsStdRow, errorRow] = await TableModel.getBHVORows(elementColumns);
      }

      return this.generateSJSTableFromRows(avgRow, rsdRow, sjsStdRow, errorRow);
    } catch (err) {
      console.error("Error in getSJSTableData:", err);
      throw err;
    }
  }

  //===========================================
  // Generate Summary for QC / SJS Quality Check
  //===========================================
  static async generateSummary(fileId) {
    try {
      // Reuse existing function to get SJS rows
      const result = await this.getSJSTableData(fileId, true, null);
      // isAdmin=true, orgId=null → bypass RBAC for summary.
      // If you need strict RBAC, pass down from controller instead.

      const rows = result.tableData || [];
      const totalElements = rows.length;
      const elementsWithinTolerance = rows.filter(
        (r) => r.isWithinTolerance
      ).length;
      const failedElements = rows
        .filter((r) => r.isWithinTolerance === false)
        .map((r) => r.fullElementName);

      return { totalElements, elementsWithinTolerance, failedElements };
    } catch (err) {
      console.error("[TableService] Error generating summary:", err);
      throw err;
    }
  }

  static async getFinalSJSTableData(startDate, endDate, isAdmin, orgId) {
    try {
      const solutionLabel = "SJS-Std";
      const combined = [...OMstdcleaned, ...OTstdcleaned];

      const { avgRow, rsdRow } = await TableModel.getQCDataWithDateRange(
        startDate,
        endDate,
        combined,
        isAdmin,
        orgId,
        solutionLabel
      );

      const [sjsStdRow, errorRow] = await TableModel.getSJSRows(
        // patched getSJSRows handles null
        combined
      );

      return this.generateSJSTableFromRows(avgRow, rsdRow, sjsStdRow, errorRow);
    } catch (err) {
      console.error("Error in getFinalSJSTableData:", err);
      throw err;
    }
  }
}

module.exports = TableService;
