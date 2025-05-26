const path = require('path');
const fileModel = require('../models/fileModel');
const dataModel = require('../models/dataModel');

const { parseAndCleanCSV } = require('../utils/csvHandler');

const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const originalName = req.file.originalname;
  const savedFilePath = path.join('uploads', originalName);

  try {
    const exists = await fileModel.fileExists(originalName);
    if (exists) {
      return res.status(400).json({ error: 'File already present' });
    }

    console.log('Upload received:', originalName, savedFilePath);

    // Insert file metadata first
    const fileRow = await fileModel.insertFile(originalName, savedFilePath);
    console.log('File inserted into DB:', fileRow);

    // Now parse and clean CSV file
    const { headers, rows, nmPpmColumns, correctedColumns } = await parseAndCleanCSV(savedFilePath);

    console.log('Parsed headers:', headers);

    if (!Array.isArray(headers)) {
      console.error('headers is NOT an array:', headers);
      return res.status(500).json({ error: 'Invalid CSV headers format' });
    }

    // Find solution label header dynamically
    const solutionLabelHeader = headers.find(h =>
      h.toLowerCase().includes('solution') && h.toLowerCase().includes('label')
    );

    console.log('Solution label column detected as:', solutionLabelHeader);

    const tableAlreadyExists = await dataModel.tableExists();

    if (tableAlreadyExists) {
      // Remove first row if duplicated header
      rows.shift();
    } else {
      // Create table with sanitized headers
      await dataModel.ensureTableWithColumns(headers);
    }

    // Insert CSV rows
    await dataModel.insertRows(rows, headers, fileRow.id);

    // Get averages for nm ppm columns by solution label (no filtering of rows this time)
    // If you want to average over all rows (no filter), modify below to pass null or skip filter
    // But per your original code, we filter by label 'QC_MES_5 ppm' here
    const averages = await dataModel.getColumnAveragesByLabel(nmPpmColumns, 'QC_MES_5 ppm', fileRow.id);

    console.log('Averages for QC_MES_5 ppm in this file:', averages);

    const correctionFactors = {};
    for (const [key, value] of Object.entries(averages)) {
      const num = parseFloat(value);
      correctionFactors[key] = (5 - num)/5
    }

    // Apply correction factors to all rows for file, updating corrected columns
    await dataModel.applyCorrectionFactorsToFileRows(fileRow.id, correctionFactors, nmPpmColumns, correctedColumns);

    res.status(200).json(fileRow);

  } catch (err) {
    console.error('DB or CSV processing error:', err.message);
    res.status(500).json({ error: 'Database or CSV processing failed' });
  }
};

module.exports = { uploadFile };