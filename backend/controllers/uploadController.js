const path = require('path');
const fs = require('fs');
const fileModel = require('../models/fileModel');
const dataModel = require('../models/dataModel');
const { parseAndCleanCSV } = require('../utils/csvHandler');
const db = require('../initialize_db'); // Same SQLite instance

const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const originalName = req.file.originalname;
  const savedFilePath = path.join('uploads', originalName);

  db.serialize(async () => {
    try {
      db.run('BEGIN TRANSACTION');

      const { headers, rows, nmPpmColumns, correctedColumns } = await parseAndCleanCSV(savedFilePath);

      const exists = await fileModel.fileExists(originalName);
      if (exists) {
        db.run('ROLLBACK');
        // Delete the duplicate file to keep uploads folder clean
        fs.unlink(savedFilePath, (err) => {
          if (err) console.error('Failed to delete duplicate file:', err);
        });
        return res.status(400).json({ error: 'File already present' });
      }

      console.log('Upload received:', originalName, savedFilePath);
      console.log('Parsed headers:', headers);

      if (!Array.isArray(headers)) {
        db.run('ROLLBACK');
        console.error('headers is NOT an array:', headers);
        // Delete the file due to invalid headers
        fs.unlink(savedFilePath, (err) => {
          if (err) console.error('Failed to delete file with invalid headers:', err);
        });
        return res.status(500).json({ error: 'Invalid CSV headers format' });
      }

      const solutionLabelHeader = headers.find(h =>
        h.toLowerCase().includes('solution') && h.toLowerCase().includes('label')
      );
      console.log('Solution label column detected as:', solutionLabelHeader);

      const errorLabels = ['QC_MES_5 ppm', 'QC_WCS_2.5 ppm', 'SJS_STD'];

      const invalidRowFound = rows.some(row => {
        const label = row[solutionLabelHeader]?.trim();
        if (errorLabels.includes(label)) {
          return nmPpmColumns.some(col => {
            const val = row[col];
            return val === null || val === undefined || val === '' || parseFloat(val) === 0;
          });
        }
        return false;
      });

      if (invalidRowFound) {
        db.run('ROLLBACK');
        // Delete the file due to invalid data rows
        fs.unlink(savedFilePath, (err) => {
          if (err) console.error('Failed to delete file with bad data:', err);
        });
        return res.status(400).json({ error: 'Bad data: Some QC or STD data was 0 or NA and should not be the case. Recheck your experiment or clean up the data before uploading.' });
      }

      const fileRow = await fileModel.insertFile(originalName, savedFilePath);
      console.log('File inserted into DB:', fileRow);

      const tableAlreadyExists = await dataModel.tableExists();
      if (tableAlreadyExists) {
        rows.shift(); // Remove possible duplicate header row
      } else {
        await dataModel.ensureTableWithColumns(headers);
      }

      await dataModel.insertRows(rows, headers, fileRow.id);

      const averages = await dataModel.getColumnAveragesByLabel(nmPpmColumns, 'QC_MES_5 ppm', fileRow.id);
      console.log('Averages for QC_MES_5 ppm in this file:', averages);

      const correctionFactors = {};
      for (const [key, value] of Object.entries(averages)) {
        const num = parseFloat(value);
        correctionFactors[key] = (5 - num) / 5;
      }

      await dataModel.applyCorrectionFactorsToFileRows(fileRow.id, correctionFactors, nmPpmColumns, correctedColumns);

      db.run('COMMIT');
      res.status(200).json(fileRow);
    } catch (err) {
      db.run('ROLLBACK');

      // Delete file on any error to keep uploads clean
      fs.unlink(savedFilePath, (unlinkErr) => {
        if (unlinkErr) console.error('Failed to delete file on error:', unlinkErr);
      });

      console.error('DB or CSV processing error:', err.message);
      res.status(500).json({ error: 'Database or CSV processing failed' });
    }
  });
};

module.exports = { uploadFile };
