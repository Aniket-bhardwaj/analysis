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
    const { headers, rows } = await parseAndCleanCSV(savedFilePath);

    console.log('Parsed headers:', headers);
    console.log('Type of headers:', Array.isArray(headers));

    if (!Array.isArray(headers)) {
      console.error('headers is NOT an array:', headers);
      return res.status(500).json({ error: 'Invalid CSV headers format' });
    }

    console.log('About to call ensureTableWithColumns with:', headers);
    console.log('Type:', Array.isArray(headers), typeof headers);

    // Ensure your DB table exists with these columns, create or update dynamically
    await dataModel.ensureTableWithColumns(headers);

    // IMPORTANT: Find the solution label column by examining the headers
    // This is the key fix - dynamically determine the column name instead of hardcoding
    const solutionLabelHeader = headers.find(h => 
      h.toLowerCase().includes('solution') && h.toLowerCase().includes('label'));
    
    console.log('Solution label column detected as:', solutionLabelHeader);

    // If we can't find the exact column, check the first row to see what values are available
    if (!solutionLabelHeader && rows.length > 0) {
      console.log('Available columns in first row:', Object.keys(rows[0]));
    }

    // Insert CSV data rows with run numbers and file_id
    await dataModel.insertRowsWithRunNumbers(rows, headers, fileRow.id, solutionLabelHeader);

    res.status(200).json(fileRow);

  } catch (err) {
    console.error('DB or CSV processing error:', err.message);
    res.status(500).json({ error: 'Database or CSV processing failed' });
  }
};

module.exports = { uploadFile };