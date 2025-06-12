const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');

class TableModel {
  /**
   * Get QC table data for a specific file with element statistics
   * @param {number} fileId - The uploaded file ID
   * @param {string} solutionLabel - Solution label to filter by (default: 'QC_MES_5 ppm')
   * @returns {Promise} Table data with element statistics
   */
  static async getQCTableData(fileId, solutionLabel = 'QC_MES_5 ppm') {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      
      const query = `
        SELECT qc.*, uf.filename, uf.uploaded_at
        FROM qc_data qc
        JOIN uploaded_files uf ON qc.file_id = uf.id
        WHERE qc."Solution Label" = ? AND qc.file_id = ? AND uf.hidden = 0
        ORDER BY qc.Timestamp ASC
      `;

      db.all(query, [solutionLabel, fileId], (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Database error:', err);
          return reject(err);
        }

        if (rows.length === 0) {
          return resolve({ 
            tableData: [], 
            elements: [], 
            fileInfo: null,
            message: 'No QC data found for this file and solution label'
          });
        }

        const fileInfo = {
          filename: rows[0].filename,
          uploadedAt: rows[0].uploaded_at,
          fileId: fileId
        };

        // Get all element columns (exclude metadata)
        const excludeColumns = [
          'id',
          'Timestamp',
          'Solution Label',
          'file_id',
          'filename',
          'uploaded_at',
          'Sample',
          'Data File',
          'Acq. Date-Time',
          'Total Dil.',
          'Vial Number'
        ];
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

          // Determine error factor based on the solution label
          const errorFactor = this.getErrorFactorForLabel(solutionLabel);

          // Calculate error percentage only if a valid factor exists
          const errorPercentage =
            errorFactor !== null && originalValues.length > 0
              ?
                originalValues.reduce(
                    (sum, val) =>
                      sum + (Math.abs(val - errorFactor) / errorFactor) * 100,
                    0
                  ) / originalValues.length
              : null;

          // Determine units
          let units = this.determineUnits(elementCol);

          // Determine acceptable error tolerance
          const errorTolerance = this.getErrorTolerance(elementCol);

          // Calculate min/max values
          const minValue = Math.min(...originalValues);
          const maxValue = Math.max(...originalValues);

          return {
            element: elementCol.replace(/[_-].*$/, ''), // Clean element name
            fullColumnName: elementCol,
            units: units,
            valueAvg: parseFloat(average.toFixed(3)),
            correctedValueAvg: correctedAverage ? parseFloat(correctedAverage.toFixed(3)) : null,
            standardDeviation: parseFloat(stdDev.toFixed(3)),
            rsd: parseFloat(rsd.toFixed(2)), // RSD as percentage
            errorPercentage: errorPercentage !== null ? parseFloat(errorPercentage.toFixed(2)) : null,
            errorFactor: errorFactor,
            errorTolerance: errorTolerance,
            sampleCount: originalValues.length,
            minValue: parseFloat(minValue.toFixed(3)),
            maxValue: parseFloat(maxValue.toFixed(3)),
            isWithinTolerance: errorPercentage !== null ? errorPercentage <= errorTolerance : null,
            distributionData: this.calculateDistribution(originalValues),
            qualityStatus: this.determineQualityStatus(rsd, errorPercentage, errorTolerance)
          };
        }).filter(item => item !== null);

        resolve({ 
          tableData: tableData,
          elements: originalColumns,
          solutionLabel: solutionLabel,
          totalSamples: rows.length,
          fileInfo: fileInfo
        });
      });
    });
  }

  /**
   * Get sample data statistics for a specific file (works with your existing data model)
   * @param {number} fileId - The uploaded file ID
   * @returns {Promise} Sample data with element statistics
   */
  static async getSampleTableData(fileId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      
      const query = `
        SELECT sd.*, uf.filename, uf.uploaded_at
        FROM sample_data sd
        JOIN sample_id_X_file_id sxf ON sd.id = sxf.sample_id
        JOIN uploaded_files uf ON sxf.file_id = uf.id
        WHERE sxf.file_id = ? AND uf.hidden = 0
        ORDER BY sd."Solution Label" ASC
      `;

      db.all(query, [fileId], (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Database error:', err);
          return reject(err);
        }

        if (rows.length === 0) {
          return resolve({ 
            tableData: [], 
            elements: [], 
            fileInfo: null,
            message: 'No sample data found for this file'
          });
        }

        const fileInfo = {
          filename: rows[0].filename,
          uploadedAt: rows[0].uploaded_at,
          fileId: fileId
        };

        // Get all element columns (exclude metadata)
        const excludeColumns = ['id', 'Solution Label', 'filename', 'uploaded_at'];
        const allColumns = Object.keys(rows[0]).filter(key => 
          !excludeColumns.some(excluded => 
            excluded.toLowerCase() === key.toLowerCase()
          )
        );

        // Separate original and corrected columns
        const originalColumns = allColumns.filter(col => !col.includes('_Corrected'));
        const correctedColumns = allColumns.filter(col => col.includes('_Corrected'));

        // Calculate statistics for each element across all samples
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

          const variance = originalValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / originalValues.length;
          const stdDev = Math.sqrt(variance);
          const rsd = average !== 0 ? (stdDev / average) * 100 : 0;

          const minValue = Math.min(...originalValues);
          const maxValue = Math.max(...originalValues);
          const median = this.calculateMedian(originalValues);

          return {
            element: elementCol.replace(/[_-].*$/, ''),
            fullColumnName: elementCol,
            units: this.determineUnits(elementCol),
            valueAvg: parseFloat(average.toFixed(3)),
            correctedValueAvg: correctedAverage ? parseFloat(correctedAverage.toFixed(3)) : null,
            standardDeviation: parseFloat(stdDev.toFixed(3)),
            rsd: parseFloat(rsd.toFixed(2)),
            sampleCount: originalValues.length,
            minValue: parseFloat(minValue.toFixed(3)),
            maxValue: parseFloat(maxValue.toFixed(3)),
            median: parseFloat(median.toFixed(3)),
            distributionData: this.calculateDistribution(originalValues),
            dataRange: parseFloat((maxValue - minValue).toFixed(3))
          };
        }).filter(item => item !== null);

        resolve({ 
          tableData: tableData,
          elements: originalColumns,
          totalSamples: rows.length,
          fileInfo: fileInfo,
          sampleLabels: [...new Set(rows.map(row => row['Solution Label']))]
        });
      });
    });
  }

  /**
   * Get QC table data by date range (enhanced version of your existing method)
   * @param {string} startDate - Start date
   * @param {string} endDate - End date  
   * @param {string} solutionLabel - Solution label to filter by
   * @returns {Promise} Table data filtered by date range
   */
  static async getQCTableDataByDateRange(startDate, endDate, solutionLabel = 'QC_MES_5 ppm') {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      
      const query = `
        SELECT qc.*, uf.filename, uf.uploaded_at
        FROM qc_data qc
        JOIN uploaded_files uf ON qc.file_id = uf.id
        WHERE qc."Solution Label" = ? 
        AND date(qc.Timestamp) BETWEEN ? AND ?
        AND uf.hidden = 0
        ORDER BY qc.Timestamp ASC
      `;

      db.all(query, [solutionLabel, startDate, endDate], (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Database error:', err);
          return reject(err);
        }

        if (rows.length === 0) {
          return resolve({ 
            tableData: [], 
            elements: [],
            dateRange: { startDate, endDate },
            message: 'No data found for the specified date range'
          });
        }

        // Use the same processing logic as getQCTableData
        const excludeColumns = ['id', 'Timestamp', 'Solution Label', 'file_id', 'filename', 'uploaded_at'];
        const allColumns = Object.keys(rows[0]).filter(key => 
          !excludeColumns.some(excluded => 
            excluded.toLowerCase() === key.toLowerCase()
          )
        );

        const originalColumns = allColumns.filter(col => !col.includes('_Corrected'));
        const correctedColumns = allColumns.filter(col => col.includes('_Corrected'));

        // Process each element column
        const tableData = originalColumns.map(elementCol => {
          const correctedCol = correctedColumns.find(col => 
            col === `${elementCol}_Corrected`
          );

          const originalValues = rows
            .map(row => parseFloat(row[elementCol]))
            .filter(val => !isNaN(val) && val !== null);
          
          const correctedValues = correctedCol ? rows
            .map(row => parseFloat(row[correctedCol]))
            .filter(val => !isNaN(val) && val !== null) : [];

          if (originalValues.length === 0) return null;

          const average = originalValues.reduce((sum, val) => sum + val, 0) / originalValues.length;
          const correctedAverage = correctedValues.length > 0 
            ? correctedValues.reduce((sum, val) => sum + val, 0) / correctedValues.length 
            : null;

          const variance = originalValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / originalValues.length;
          const stdDev = Math.sqrt(variance);
          const rsd = average !== 0 ? (stdDev / average) * 100 : 0;

          const errorFactor = this.getErrorFactorForLabel(solutionLabel);

          const errorPercentage =
            errorFactor !== null && originalValues.length > 0
              ?
                originalValues.reduce(
                    (sum, val) =>
                      sum + (Math.abs(val - errorFactor) / errorFactor) * 100,
                    0
                  ) / originalValues.length
              : null;

          const errorTolerance = this.getErrorTolerance(elementCol);

          return {
            element: elementCol.replace(/[_-].*$/, ''),
            fullColumnName: elementCol,
            units: this.determineUnits(elementCol),
            valueAvg: parseFloat(average.toFixed(3)),
            correctedValueAvg: correctedAverage ? parseFloat(correctedAverage.toFixed(3)) : null,
            standardDeviation: parseFloat(stdDev.toFixed(3)),
            rsd: parseFloat(rsd.toFixed(2)),
            errorPercentage: errorPercentage !== null ? parseFloat(errorPercentage.toFixed(2)) : null,
            errorFactor: errorFactor,
            errorTolerance: errorTolerance,
            sampleCount: originalValues.length,
            isWithinTolerance: errorPercentage !== null ? errorPercentage <= errorTolerance : null,
            distributionData: this.calculateDistribution(originalValues),
            qualityStatus: this.determineQualityStatus(rsd, errorPercentage, errorTolerance)
          };
        }).filter(item => item !== null);
        
        resolve({ 
          tableData: tableData,
          elements: originalColumns,
          solutionLabel: solutionLabel,
          totalSamples: rows.length,
          dateRange: { startDate, endDate },
          filesIncluded: [...new Set(rows.map(row => ({ id: row.file_id, filename: row.filename })))]
        });
      });
    });
  }

  /**
   * Get all solution labels available for a specific file (integrates with your existing data structure)
   * @param {number} fileId - The uploaded file ID
   * @returns {Promise} Array of solution labels
   */
  static async getAllSolutionLabelsForTable(fileId) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      
      const qcQuery = `
        SELECT DISTINCT "Solution Label" as label, 'qc_data' as source, COUNT(*) as count
        FROM qc_data
        WHERE file_id = ?
        GROUP BY "Solution Label"
      `;

      const sampleQuery = `
        SELECT DISTINCT sd."Solution Label" as label, 'sample_data' as source, COUNT(*) as count
        FROM sample_data sd
        JOIN sample_id_X_file_id sxf ON sd.id = sxf.sample_id
        WHERE sxf.file_id = ?
        GROUP BY sd."Solution Label"
      `;

      const combinedQuery = `${qcQuery} UNION ALL ${sampleQuery} ORDER BY label`;

      db.all(combinedQuery, [fileId, fileId], (err, rows) => {
        db.close();
        if (err) return reject(err);
        
        const labels = {
          all: rows,
          qc: rows.filter(row => row.source === 'qc_data'),
          sample: rows.filter(row => row.source === 'sample_data'),
          qcLabels: rows.filter(row => row.source === 'qc_data').map(row => row.label),
          sampleLabels: rows.filter(row => row.source === 'sample_data').map(row => row.label)
        };
        
        resolve(labels);
      });
    });
  }

  /**
   * Get comprehensive file summary with element data (works with your existing models)
   * @param {number} fileId - The uploaded file ID
   * @returns {Promise} Complete file summary with all data types
   */
  static async getFileSummary(fileId) {
    try {
      const [qcData, sampleData, solutionLabels] = await Promise.all([
        this.getQCTableData(fileId),
        this.getSampleTableData(fileId),
        this.getAllSolutionLabelsForTable(fileId)
      ]);

      return {
        fileId: fileId,
        fileInfo: qcData.fileInfo || sampleData.fileInfo,
        qcData: qcData,
        sampleData: sampleData,
        solutionLabels: solutionLabels,
        summary: {
          totalQCSamples: qcData.totalSamples || 0,
          totalSampleData: sampleData.totalSamples || 0,
          elementsAnalyzed: [...new Set([...qcData.elements, ...sampleData.elements])],
          hasQCData: qcData.tableData.length > 0,
          hasSampleData: sampleData.tableData.length > 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to get file summary: ${error.message}`);
    }
  }

  // ===========================
  // Helper Methods
  // ===========================

  static determineUnits(columnName) {
    const lowerCol = columnName.toLowerCase();
    if (lowerCol.includes('ppm')) return 'ppm';
    if (lowerCol.includes('ppb')) return 'ppb';
    if (lowerCol.includes('%')) return '%';
    if (lowerCol.includes('mg/l')) return 'mg/L';
    if (lowerCol.includes('ug/l')) return 'μg/L';
    return 'ppm'; // default
  }

  static getErrorFactorForLabel(solutionLabel) {
    if (!solutionLabel) return null;
    const clean = solutionLabel.replace(/[_\s]/g, '').toLowerCase();
    if (clean.includes('qcmes5ppm')) return 5;
    if (clean.includes('qcmes50ppb')) return 50;
    return null;
  }


  static getErrorTolerance(elementName) {
    // Define error tolerance thresholds for different elements
    const toleranceMap = {
      'Al': 10.0, 'Aluminium': 10.0, 'Aluminum': 10.0,
      'Ca': 8.0, 'Calcium': 8.0,
      'Cr': 7.0, 'Chromium': 7.0,
      'Fe': 5.0, 'Iron': 5.0,
      'Mg': 6.0, 'Magnesium': 6.0,
      'Mn': 8.0, 'Manganese': 8.0,
      'Cu': 6.0, 'Copper': 6.0,
      'Zn': 7.0, 'Zinc': 7.0,
      'Pb': 9.0, 'Lead': 9.0,
      'As': 12.0, 'Arsenic': 12.0,
      'default': 10.0
    };

    // Extract element symbol/name from column name
    const cleanName = elementName.replace(/[_-].*$/, '').replace(/[^a-zA-Z]/g, '');
    return toleranceMap[cleanName] || toleranceMap['default'];
  }

  static determineQualityStatus(rsd, errorPercentage, errorTolerance) {

    if (errorPercentage === null || errorPercentage === undefined) {
      return 'N/A';
    }

    if (rsd <= 5 && errorPercentage <= errorTolerance * 0.5) return 'Excellent';
    if (rsd <= 10 && errorPercentage <= errorTolerance) return 'Good';
    if (rsd <= 15 && errorPercentage <= errorTolerance * 1.5) return 'Acceptable';
    return 'Poor';
  }

  static calculateMedian(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  static calculateDistribution(values) {
    // Simple distribution calculation for mini histogram
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    if (range === 0) return [values.length]; // All values are the same
    
    const binCount = Math.min(10, Math.max(3, values.length)); // 3-10 bins
    const binSize = range / binCount;
    
    const bins = Array(binCount).fill(0);
    
    values.forEach(value => {
      let binIndex = Math.floor((value - min) / binSize);
      if (binIndex >= binCount) binIndex = binCount - 1; // Handle edge case
      bins[binIndex]++;
    });
    
    return bins;
  }
}

module.exports = TableModel;