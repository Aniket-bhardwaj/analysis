const db = require('../initialize_db');
const { MEconc, TEconc } = require('../colHeaders');
const QcCheckService = require('../services/qcCheckService');

// Core dashboard statistics functions
function getTotalFilesCount() {
  const sql = `SELECT COUNT(*) AS count FROM uploaded_files WHERE hidden = 0`;
  return new Promise((resolve, reject) => {
    db.get(sql, [], (err, row) => {
      if (err) {
        console.error('Error getting total files count:', err);
        return reject(err);
      }
      resolve(row?.count || 0);
    });
  });
}

function getTotalSamplesCount() {
  const sql = `SELECT COUNT(*) AS count FROM sample_data`;
  return new Promise((resolve, reject) => {
    db.get(sql, [], (err, row) => {
      if (err) {
        console.error('Error getting total samples count:', err);
        return reject(err);
      }
      resolve(row?.count || 0);
    });
  });
}

async function getQCPassRate() {
  return new Promise((resolve, reject) => {
    // Get QC files from past week
    const sql = `
      SELECT DISTINCT
        uploaded_files.id,
        uploaded_files.type,
        uploaded_files.filename
      FROM uploaded_files
      JOIN qc_data ON uploaded_files.id = qc_data.file_id
      WHERE uploaded_files.uploaded_at >= DATE('now', '-7 days')
        AND uploaded_files.hidden = 0
        AND qc_data."Solution Label" LIKE '%QC MES%'
    `;
    
    db.all(sql, [], async (err, files) => {
      if (err) {
        console.error('Error getting QC files:', err);
        return reject(err);
      }
      
      if (!files || files.length === 0) {
        return resolve({ passRate: 0, totalChecks: 0, passedChecks: 0 });
      }
      
      let totalChecks = 0;
      let passedChecks = 0;
      
      try {
        // Process each file to calculate QC pass/fail status
        for (const file of files) {
          const fileId = file.id;
          
          // Get the appropriate QC solution label for this file type
          const solutionLabel = await QcCheckService.getSolutionLabelsForFile(fileId);
          
          if (!solutionLabel) continue;
          
          // Get QC summary which includes elements within tolerance
          const qcSummary = await QcCheckService.getSummaryForQC(fileId, solutionLabel);
          
          // Each element is considered a "check"
          totalChecks += qcSummary.totalElements;
          passedChecks += qcSummary.elementsWithinTolerance;
        }
        
        const passRate = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
        
        resolve({
          passRate,
          totalChecks,
          passedChecks
        });
        
      } catch (error) {
        console.error('Error calculating QC pass rate:', error);
        reject(error);
      }
    });
  });
}

function getQCGraphDataForDashboard() {
  return new Promise((resolve, reject) => {
    const filesQuery = `
      SELECT DISTINCT 
        uploaded_files.id,
        uploaded_files.type,
        uploaded_files.uploaded_at,
        uploaded_files.filename
      FROM uploaded_files
      JOIN qc_data ON uploaded_files.id = qc_data.file_id
      WHERE uploaded_files.uploaded_at >= DATE('now', '-7 days')
        AND uploaded_files.hidden = 0
        AND qc_data."Solution Label" LIKE '%QC MES%'
      ORDER BY uploaded_files.uploaded_at ASC
    `;

    db.all(filesQuery, [], async (err, files) => {
      if (err) return reject(err);
      if (!files || files.length === 0) {
        return resolve({ success: true, graphData: {} });
      }

      const allGraphData = {};

      try {
        for (const file of files) {
          const fileId = file.id;
          const fileType = file.type;
          
          const VALID_LABELS = {
            1: 'QC MES 5 ppm',
            2: 'QC MES 50 ppb',
          };
          
          const ELEMENT_TABLES = {
            1: MEconc,
            2: TEconc,
          };

          const qcLabel = VALID_LABELS[fileType];
          const elementNames = ELEMENT_TABLES[fileType];

          if (!qcLabel || !Array.isArray(elementNames) || elementNames.length === 0) {
            continue;
          }

          const timeColumn = fileType === 2 ? `"Acq. Date-Time"` : `"Timestamp"`;

          const dataQuery = `
            SELECT ${timeColumn} AS timestamp, ${elementNames.map(el => `"${el}"`).join(', ')}
            FROM qc_data
            WHERE file_id = ? AND "Solution Label" = ?
            ORDER BY ${timeColumn} ASC
          `;

          const rows = await new Promise((resolve, reject) => {
            db.all(dataQuery, [fileId, qcLabel], (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            });
          });

          const fileGraphData = {};
          elementNames.forEach(element => {
            fileGraphData[element] = rows
              .map(row => ({
                timestamp: row.timestamp,
                value: parseFloat(row[element]),
                fileId: fileId,
                fileName: file.filename,
                fileType: fileType === 1 ? 'PPM' : 'PPB',
                uploadedAt: file.uploaded_at
              }))
              .filter(point => !isNaN(point.value));
          });

          elementNames.forEach(element => {
            if (!allGraphData[element]) {
              allGraphData[element] = [];
            }
            allGraphData[element] = allGraphData[element].concat(fileGraphData[element]);
          });
        }

        Object.keys(allGraphData).forEach(element => {
          allGraphData[element].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });

        resolve({
          success: true,
          graphData: allGraphData,
          fileCount: files.length,
          elementCount: Object.keys(allGraphData).length
        });

      } catch (error) {
        reject(error);
      }
    });
  });
}

async function getDashboardSummary() {
  try {
    const [totalFiles, totalSamples, qcStats] = await Promise.all([
      getTotalFilesCount(),
      getTotalSamplesCount(),
      getQCPassRate()
    ]);

    return {
      totalFiles,
      totalSamples,
      qcPassRate: qcStats.passRate,
      qcTotalChecks: qcStats.totalChecks,
      qcPassedChecks: qcStats.passedChecks
    };
  } catch (err) {
    console.error('Error getting dashboard summary:', err);
    throw err;
  }
}

module.exports = {
  getTotalFilesCount,
  getTotalSamplesCount,
  getQCPassRate,
  getDashboardSummary,
  getQCGraphDataForDashboard
};