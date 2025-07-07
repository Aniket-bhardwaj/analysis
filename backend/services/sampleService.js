const SampleModel = require("../models/sampleModel");
const TableModel = require("../models/tableModel");
const { MEcorr, TEcorr , MEconc,TEconc} = require("../colHeaders");
const qcl = {
  1: "QC MES 5 ppm",
  2: "QC MES 50 ppb",
};
const typeCorr = {
  1: MEcorr,
  2: TEcorr
}
const typeO = {
  1: MEconc,
  2: TEconc  
}

function generateErrorCheckRows(solutionLabel, avgRow) {
  return new Promise((resolve) => {
    const errorFactor = parseFloat(solutionLabel.match(/[\d.]+/)[0]);
    const result = Object.entries(avgRow).map(([element, avg]) => {
      const error = Math.abs((avg - errorFactor) / errorFactor) * 100;
      return {
        elem: element,
        solutionLabel,
        avg: +avg,
        error: +error.toFixed(2),
        withinLimit: error <= 10
      };
    });
    resolve(result);
  });
}


function mergeCorrectedValues(data, row) {
  return data.map(obj => {
    const correctedKey = `${obj.elem}_Corrected`;
    return {
      ...obj,
      corrected: row[correctedKey] ?? null
    };
  });
}

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






  static async getSampleTableData(sampleId) {
    try {
      console.log("Fetching sample table for sampleId:", sampleId);
  
      const files = await SampleModel.getFileTypesWithIdBySampleId(sampleId);
  
      if (!files || files.length === 0) {
        throw new Error(`No visible files found for sampleId: ${sampleId}`);
      }
  
      const fileIds = files.map(f => f.file_id);
      const fileLinks = await SampleModel.getFileNamesByFileIds(fileIds);
  
      if (files.length === 1) {
        const { file_id, type } = files[0];
  
        const row = await SampleModel.getSampleRowByIdAndColumns(sampleId, typeCorr[type]);
        const avgrow = await SampleModel.getAvg(file_id, qcl[type], typeO[type]);
        const errorobj = await generateErrorCheckRows(qcl[type], avgrow);
        const merged = await mergeCorrectedValues(errorobj, row);
  
        return {
          tableData: merged,
          fileLinks
        };
      } else {
        const file1 = files.find(f => f.type === 1);
        const file2 = files.find(f => f.type === 2);
  
        if (!file1 || !file2) {
          throw new Error("Required file types 1 and 2 not found for sample");
        }
  
        const row1 = await SampleModel.getSampleRowByIdAndColumns(sampleId, typeCorr[1]);
        const row2 = await SampleModel.getSampleRowByIdAndColumns(sampleId, typeCorr[2]);
        const avgrow1 = await SampleModel.getAvg(file1.file_id, qcl[1], typeO[1]);
        const avgrow2 = await SampleModel.getAvg(file2.file_id, qcl[2], typeO[2]);
        const errorobj1 = await generateErrorCheckRows(qcl[1], avgrow1);
        const errorobj2 = await generateErrorCheckRows(qcl[2], avgrow2);
        const merged1 = await mergeCorrectedValues(errorobj1, row1);
        const merged2 = await mergeCorrectedValues(errorobj2, row2);
        const finalMerged = [...merged1, ...merged2];
  
        return {
          tableData: finalMerged,
          fileLinks
        };
      }
    } catch (error) {
      console.error("Error in sampleService.getSampleTableData:", error);
      throw error;
    }
  }
  
}

module.exports = SampleService;
