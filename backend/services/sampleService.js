const SampleModel = require("../models/sampleModel");
const TableModel = require("../models/tableModel");
const { MEcorr, TEcorr } = require("../colHeaders");
const qcl = {
  1: "QC MES 5 ppm",
  2: "QC MES 50 ppb",
};

class SampleService {
  static async getSampleElementDetails(sampleId, elementName) {
    try {
      // Clean the element name
      const cleanedElementName = elementName.replace(/_Corrected$/, '');

      // Classify type based on units
      const csvType = cleanedElementName.includes('ppb') ? 2 : 1;

      // Get correct file_id for this sample and type
      const fileId = await sampleModel.getFileIdForSampleAndType(sampleId, csvType);

      if (!fileId) {
        throw new Error('No matching file found for this type.');
      }

      // Fetch value and status from avg & rsd tables
      const { avgRow, rsdRow } = await TableModel.getAvgAndRsdRows(fileId, qcl[csvType], cleanedElementName);

      return {
        element: cleanedElementName,
        type: csvType,
        file_id: fileId,
        avgRow,
        rsdRow,
      };
    } catch (error) {
      console.error('Error in sampleService.getSampleElementDetails:', error);
      throw error;
    }
  };


  static async getVisibleFileTypes(sampleId) {
    try {
      const typeArr = await SampleModel.getVisibleFileTypesBySampleId(sampleId);

      let columnNames = [];

      if (typeArr.length === 1 && typeArr[0] === "1") {
        columnNames = MEcorr;
      } else if (typeArr.length === 1 && typeArr[0] === "2") {
        columnNames = TEcorr;
      } else if (typeArr.includes("1") && typeArr.includes("2")) {
        columnNames = [...MEcorr, ...TEcorr];
      }
      const row = await SampleModel.getSampleRowByIdAndColumns(sampleId,columnNames);
    } catch (error) {
      console.error("Error in sampleService.getVisibleFileTypes:", error);
      throw error;
    }
  }
}

module.exports = SampleService;
