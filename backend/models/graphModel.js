// models/graphModel.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');

class GraphModel {
  static getGraphDataByFileId(fileId, solutionLabel = 'QC_MES_5 ppm') {
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
          return resolve({ originalData: [], correctedData: [], elements: [] });
        }

        // Get all column names except metadata columns
        const excludeColumns = ['Timestamp', 'Solution Label', 'file_id'];
        const allColumns = Object.keys(rows[0]).filter(key => 
          !excludeColumns.some(excluded => 
            excluded.toLowerCase() === key.toLowerCase()
          )
        );

        // Separate original and corrected columns
        const originalColumns = allColumns.filter(col => !col.includes('_Corrected'));
        const correctedColumns = allColumns.filter(col => col.includes('_Corrected'));

        // Create element pairs (original -> corrected mapping)
        const elementPairs = originalColumns.map(originalCol => {
          const correctedCol = correctedColumns.find(corrCol => 
            corrCol === `${originalCol}_Corrected`
          );
          return {
            element: originalCol,
            originalColumn: originalCol,
            correctedColumn: correctedCol
          };
        }).filter(pair => pair.correctedColumn); // Only include pairs that have both original and corrected

        // Transform data for original values
        const originalGraphData = elementPairs.map(pair => ({
          element: pair.element,
          data: rows.map(row => ({
            timestamp: row.Timestamp || row.timestamp,
            value: parseFloat(row[pair.originalColumn]) || 0
          })).filter(point => !isNaN(point.value))
        }));

        // Transform data for corrected values
        const correctedGraphData = elementPairs.map(pair => ({
          element: pair.element, // Use same element name for consistency
          data: rows.map(row => ({
            timestamp: row.Timestamp || row.timestamp,
            value: parseFloat(row[pair.correctedColumn]) || 0
          })).filter(point => !isNaN(point.value))
        }));

        resolve({ 
          originalData: originalGraphData,
          correctedData: correctedGraphData,
          elements: elementPairs.map(pair => pair.element)
        });
      });
    });
  }

  static async getAllSolutionLabels(fileId) {
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

module.exports = GraphModel;