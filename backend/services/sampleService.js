const sampleModel = require('../models/sampleModel');
const TableModel = require('../models/tableModel');
const qcl = {
    1: 'QC MES 5 ppm',
    2: 'QC MES 50 ppb',
  };




exports.getSampleElementDetails = async (sampleId, elementName) => {
  // Clean element name
  const cleanedElementName = elementName.replace(/_Corrected$/, '');

  // Classify type based on units
  const csvType = cleanedElementName.includes('ppb') ? 2 : 1;

  // Get correct file_id for this sample and type
  const fileId = await sampleModel.getFileIdForSampleAndType(sampleId, csvType);

  if (!fileId) {
    throw new Error('No matching file found for this type.');
  }

  // Now fetch value and status for the sample and element
  const {avgRow , rsdRow} = await TableModel.getAvgAndRsdRows(fileId,qcl[csvType],cleanedElementName);
  return {
    element: cleanedElementName,
    type,
    file_id: fileId,
    ...result
  };
};
