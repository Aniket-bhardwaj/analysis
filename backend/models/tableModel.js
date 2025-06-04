// models/tableModel.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');

class TableModel {
  static async getQCTableData(fileId, solutionLabel = 'QC_MES_5 ppm') {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      
      const query = `
        SELECT * FROM data
        WHERE "Solution Label" = ? AND file_id = ?
        ORDER BY Timestamp ASC
      `;

      db.all(query, [solutionLabel, fileId], (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Database error:', err);
          return reject(err);
        }

        if (rows.length === 0) {
          return resolve({ tableData: [], elements: [] });
        }

        // Get all element columns (exclude metadata)
        const excludeColumns = ['Timestamp', 'Solution Label', 'file_id'];
        const allColumns = Object.keys(rows[0]).filter(key => 
          !excludeColumns.some(excluded => 
            excluded.toLowerCase() === key.toLowerCase()
          )
        );

        // Separate original and corrected columns
        const originalColumns = allColumns.filter(col => !col.includes('_Corrected'));
        const correctedColumns = allColumns.filter(col => col.includes('_Corrected'));

        // Calculate statistics for each element
        const tableData = originalColumns.map(elementCol => {
          const correctedCol = correctedColumns.find(col => 
            col === `${elementCol}_Corrected`
          );

          // Extract values for calculations
          const originalValues = rows
            .map(row => parseFloat(row[elementCol]))
            .filter(val => !isNaN(val) && val !== null);
          
          const correctedValues = correctedCol ? rows
            .map(row => parseFloat(row[correctedCol]))
            .filter(val => !isNaN(val) && val !== null) : [];

          if (originalValues.length === 0) return null;

          // Calculate statistics
          const average = originalValues.reduce((sum, val) => sum + val, 0) / originalValues.length;
          const correctedAverage = correctedValues.length > 0 
            ? correctedValues.reduce((sum, val) => sum + val, 0) / correctedValues.length 
            : null;

          // Calculate standard deviation
          const variance = originalValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / originalValues.length;
          const stdDev = Math.sqrt(variance);
          
          // Calculate RSD (Relative Standard Deviation) as percentage
          const rsd = average !== 0 ? (stdDev / average) * 100 : 0;

          // Calculate error percentage (assuming corrected values are the "true" values)
          const errorPercentage = correctedAverage !== null && correctedAverage !== 0 
            ? Math.abs((average - correctedAverage) / correctedAverage) * 100 
            : 0;

          // Determine units (you might want to store this in your database)
          let units = 'ppm'; // default
          if (elementCol.toLowerCase().includes('ppm')) units = 'ppm';
          else if (elementCol.toLowerCase().includes('ppb')) units = 'ppb';
          else if (elementCol.toLowerCase().includes('%')) units = '%';

          // Determine acceptable error tolerance (you can make this configurable)
          const errorTolerance = this.getErrorTolerance(elementCol);

          return {
            element: elementCol.replace(/[_-].*$/, ''), // Clean element name
            fullColumnName: elementCol,
            units: units,
            valueAvg: parseFloat(average.toFixed(3)),
            correctedValueAvg: correctedAverage ? parseFloat(correctedAverage.toFixed(3)) : null,
            standardDeviation: parseFloat(stdDev.toFixed(3)),
            rsd: parseFloat(rsd.toFixed(2)), // RSD as percentage
            errorPercentage: parseFloat(errorPercentage.toFixed(2)),
            errorTolerance: errorTolerance,
            sampleCount: originalValues.length,
            isWithinTolerance: errorPercentage <= errorTolerance,
            distributionData: this.calculateDistribution(originalValues)
          };
        }).filter(item => item !== null);

        resolve({ 
          tableData: tableData,
          elements: originalColumns,
          solutionLabel: solutionLabel,
          totalSamples: rows.length
        });
      });
    });
  }

  static async getQCTableDataByDateRange(startDate, endDate, solutionLabel = 'QC_MES_5 ppm') {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      
      const query = `
        SELECT * FROM data
        WHERE "Solution Label" = ? 
        AND date(Timestamp) BETWEEN ? AND ?
        ORDER BY Timestamp ASC
      `;

      db.all(query, [solutionLabel, startDate, endDate], (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Database error:', err);
          return reject(err);
        }

        if (rows.length === 0) {
          return resolve({ tableData: [], elements: [] });
        }

        // Use the same processing logic as getQCTableData
        // (This is a simplified version - you might want to extract the processing logic into a separate method)
        const excludeColumns = ['Timestamp', 'Solution Label', 'file_id'];
        const allColumns = Object.keys(rows[0]).filter(key => 
          !excludeColumns.some(excluded => 
            excluded.toLowerCase() === key.toLowerCase()
          )
        );

        const originalColumns = allColumns.filter(col => !col.includes('_Corrected'));
        
        // Process data similar to getQCTableData method
        // (Implementation would be the same as above)
        
        resolve({ 
          tableData: [], // Implement the same processing logic here
          elements: originalColumns,
          solutionLabel: solutionLabel,
          totalSamples: rows.length,
          dateRange: { startDate, endDate }
        });
      });
    });
  }

  static getErrorTolerance(elementName) {
    // Define error tolerance thresholds for different elements
    // You can make this configurable or store in database
    const toleranceMap = {
      'Al': 10.0,    // 10% for Aluminum
      'Aluminium': 10.0,
      'Ca': 8.0,     // 8% for Calcium
      'Calcium': 8.0,
      'Cr': 7.0,     // 7% for Chromium
      'Cromium': 7.0,
      'Fe': 5.0,     // 5% for Iron
      'Iron': 5.0,
      'Mg': 6.0,     // 6% for Magnesium
      'Magnesium': 6.0,
      'Mn': 8.0,     // 8% for Manganese
      'Manganese': 8.0,
      'default': 10.0 // Default tolerance
    };

    // Extract element symbol/name from column name
    const cleanName = elementName.replace(/[_-].*$/, '').replace(/[^a-zA-Z]/g, '');
    
    return toleranceMap[cleanName] || toleranceMap['default'];
  }

  static calculateDistribution(values) {
    // Simple distribution calculation for mini histogram
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const binCount = Math.min(10, values.length); // Max 10 bins
    const binSize = range / binCount;
    
    const bins = Array(binCount).fill(0);
    
    values.forEach(value => {
      let binIndex = Math.floor((value - min) / binSize);
      if (binIndex >= binCount) binIndex = binCount - 1; // Handle edge case
      bins[binIndex]++;
    });
    
    return bins;
  }

  static async getAllSolutionLabelsForTable(fileId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      
      const query = `
        SELECT DISTINCT "Solution Label" as label
        FROM data
        WHERE file_id = ?
        ORDER BY "Solution Label"
      `;

      db.all(query, [fileId], (err, rows) => {
        db.close();
        if (err) return reject(err);
        resolve(rows.map(row => row.label));
      });
    });
  }
}

module.exports = TableModel;