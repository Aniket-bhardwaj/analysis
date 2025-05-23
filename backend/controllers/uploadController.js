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

    // Parse and clean CSV first
    const { headers, rows } = await parseAndCleanCSV(savedFilePath);

    if (!Array.isArray(headers)) {
      console.error('headers is NOT an array:', headers);
      return res.status(500).json({ error: 'Invalid CSV headers format' });
    }

    // Extract measured timestamp from first row
    const measuredTimestamp = rows[0]?.Timestamp || null;

    // Insert file metadata including measured timestamp
    const fileRow = await fileModel.insertFile(originalName, savedFilePath, measuredTimestamp);
    console.log('File inserted into DB:', fileRow);

    // Ensure your DB table exists with these columns
    await dataModel.ensureTableWithColumns(headers);

    // Detect solution label column (e.g., “Solution Label”)
    const solutionLabelHeader = headers.find(h => 
      h.toLowerCase().includes('solution') && h.toLowerCase().includes('label'));

    if (!solutionLabelHeader && rows.length > 0) {
      console.log('Available columns in first row:', Object.keys(rows[0]));
    }

    // Insert the cleaned rows into the data table
    await dataModel.insertRowsWithRunNumbers(rows, headers, fileRow.id, solutionLabelHeader);

    res.status(200).json(fileRow);

  } catch (err) {
    console.error('DB or CSV processing error:', err.message);
    res.status(500).json({ error: 'Database or CSV processing failed' });
  }
};


module.exports = { uploadFile };