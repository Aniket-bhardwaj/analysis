const TableModel = require("../models/tableModel");
const fileModel = require("../models/fileModel");
const { is } = require("zod/v4/locales");

const miniTableService = {
  async getMiniTableForElement(fileId, solutionLabel, element,isAdmin, orgId) {
    try {
      console.log("Fetching mini table for element:", element, "in fileId:", fileId, "with solutionLabel:", solutionLabel);
      const fileType = await fileModel.getTypeById(fileId); // 1 = ppm, 2 = ppb
      const unit = fileType === 1 ? "ppm" : "ppb";

      const rows = await TableModel.getMiniTableRaw(fileId, solutionLabel, element ,isAdmin, orgId);
      //console.log("🛠️ Received rows in service:", rows);

      if (!rows || rows.length === 0) return [];

      const match = solutionLabel.match(/[\d.]+/);
      const errorFactor = match ? parseFloat(match[0]) : 1;
      const errorTolerance = 10.0;

      const miniTableData = rows
        .map((row) => {
          const rawVal = parseFloat(row.value); // FIXED
          const timeField = row.timestamp;      // SIMPLIFIED
          const errorPercent =
            errorFactor && !isNaN(rawVal)
              ? parseFloat(((Math.abs(rawVal - errorFactor) / errorFactor) * 100).toFixed(2))
              : null;

          const status =
            errorPercent !== null
              ? errorPercent <= errorTolerance ? "Pass" : "Fail"
              : "N/A";

          return {
            timestamp: timeField,
            value: isNaN(rawVal) ? null : rawVal.toFixed(3),
            units: unit,
            errorPercentage: errorPercent,
            status,
          };
        })
        .filter((row) => row.timestamp && row.value !== null);
        //console.log("Final mini table data:", miniTableData);

      return miniTableData;
    } catch (err) {
  
      console.error("miniTableService error:", err);
      throw err;
    }
  },

  async getSJSMiniTableForElement(fileId,  element,isAdmin, orgId) {
  try {
    const fileType = await fileModel.getTypeById(fileId); // 1 = ppm, 2 = ppb
    const season = await fileModel.getSeasonById(fileId);
    const solutionLabel = season === 'soil' ? 'SJS-Std' : 'BHVO-2 STD';
    element += "_Corrected";

    const rows = await TableModel.getMiniTableRaw(fileId, solutionLabel, element, isAdmin, orgId);
    if (!rows || rows.length === 0) return [];
    let sjsStdRow, errorRow;

    if (season === "soil") {
            [sjsStdRow, errorRow] = await TableModel.getSJSRows([element]);
          } else if (season === "basalt") {
            [sjsStdRow, errorRow] = await TableModel.getBHVORows([element]);
          }
    const sjsStd = parseFloat(sjsStdRow[element]);
    
    const sjsError = 10;
    console.log("SJS Std for element:", sjsStdRow);

    const errorFactor = isNaN(sjsStd) ? 1 : sjsStd;
    const errorTolerance = isNaN(sjsStd) || isNaN(sjsError) || sjsStd === 0
  ? 0
  : 10;
  console.log("Error factor:", errorFactor, "Error tolerance:", errorTolerance);


    const miniTableData = rows
      .map((row) => {
        const rawVal = parseFloat(row.value);
        const timeField = row.timestamp;

        const errorPercent =
          errorFactor && !isNaN(rawVal)
            ? parseFloat(((Math.abs(rawVal - errorFactor) / errorFactor) * 100).toFixed(2))
            : null;

        const isWithinTolerance =
          errorPercent !== null ? errorPercent <= errorTolerance : null;

        return {
          timestamp: timeField,
          value: isNaN(rawVal) ? null : rawVal.toFixed(3),
          sjsStd: errorFactor,
          tolerance: errorTolerance,
          actual: errorPercent,
          isWithinTolerance
        };
      })
      .filter((row) => row.timestamp && row.value !== null);

    return miniTableData;
  } catch (err) {
    console.error("miniTableService error:", err);
    throw err;
  }
}

};

module.exports = miniTableService;
