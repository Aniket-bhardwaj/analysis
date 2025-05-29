const path = require('path');
const fs = require('fs');
const fileModel = require('../models/fileModel');
const dataModel = require('../models/dataModel');
const { completeRows,cleanCSV,colCheck } = require('../utils/csvHandler');
const db = require('../initialize_db');
const {
  OcleanedHeaders,
  completeHeaders,
  nmPpmColumns,
  correctedColumns,
  errorLabels
} = require('../array'); 

 // Same SQLite instance

const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const originalName = req.file.originalname;
  const savedFilePath = path.join('uploads', originalName);

  db.serialize(async () => {
    try {
      db.run('BEGIN TRANSACTION');
      const { headers: cleanedheaders, rows: cleanedrows } = await cleanCSV(savedFilePath);
      //Checking for same columns
      const result = colCheck(cleanedheaders);

    if(!result.valid){
      db.run('ROLLBACK');
        // Delete the duplicate file to keep uploads folder clean
        fs.unlink(savedFilePath, (err) => {
          if (err) console.error('Failed to delete duplicate file:', err);
        });
        console.log("Header validation failed:");


      return res.status(400).json({
      error: 'One or more uploaded CSV Column names do not match expected names',
      missingColumns: result.missing,
      extraColumns: result.extra

    });

    }
    //completing rows(adding null values for added columns) 
    const rows = completeRows(cleanedrows,OcleanedHeaders,completeHeaders);


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


      const solutionLabelHeader = completeHeaders.find(h =>
        h.toLowerCase().includes('solution') && h.toLowerCase().includes('label')
      );
      console.log('Solution label column detected as:', solutionLabelHeader);


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

      rows.shift();

      await dataModel.insertRows(rows, completeHeaders, fileRow.id);

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
