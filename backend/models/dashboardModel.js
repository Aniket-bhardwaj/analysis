const db = require('../initialize_db');
const { MEconc, TEconc } = require('../colHeaders');
const QcCheckService = require('../services/qcCheckService');
const ELEMENT_TABLES = {
  1: MEconc,
  2: TEconc,
};


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

function getQCGraphDataLastWeek() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);

  const start = startDate.toISOString().split('T')[0] + ' 00:00:00';
  const end = endDate.toISOString().split('T')[0] + ' 23:59:59';

  const query = `
    SELECT q.*, f.type, f.uploaded_at
    FROM qc_data q
    JOIN uploaded_files f ON q.file_id = f.id
    WHERE f.uploaded_at BETWEEN ? AND ?
      AND f.hidden = 0
      AND q."Solution Label" LIKE 'QC%'
    ORDER BY f.uploaded_at ASC
  `;

  const parseTimestamp = (ts) => {
    if (typeof ts !== 'string') return null;

    const [datePart, timePart] = ts.split(' ');
    if (!datePart || !timePart) return null;

    const [day, month, year] = datePart.split('-');
    if (!day || !month || !year) return null;

    const isoFormat = `${year}-${month}-${day}T${timePart}:00`;
    const parsed = new Date(isoFormat);

    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  return new Promise((resolve, reject) => {
    db.all(query, [start, end], (err, rows) => {
      if (err) return reject(err);

      const allGraphData = {};
      const uniqueFiles = new Set();

      for (const row of rows) {
        const fileType = row.type;
        const rawTimestamp = fileType === 2 ? row["Acq. Date-Time"] : row["Timestamp"];
        const timestamp = parseTimestamp(rawTimestamp);

        if (!timestamp) {
          // console.warn(`Skipping invalid timestamp: ${rawTimestamp}`);
          continue;
        }

        const elementNames = ELEMENT_TABLES[fileType];
        if (!Array.isArray(elementNames)) continue;
        uniqueFiles.add(row.file_id);

        for (const el of elementNames) {
          const val = parseFloat(row[el]);
          if (!isNaN(val)) {
            if (!allGraphData[el]) allGraphData[el] = [];
            allGraphData[el].push({ timestamp, value: val });
          }
        }
      }

      resolve({
        success: true,
        graphData: allGraphData,
        fileCount: uniqueFiles.size,
        elementCount: Object.keys(allGraphData).length
      });

      // Optional debug log
      // if (allGraphData['107 Ag [ He ] Conc. [ ppb ]']) {
      //   console.log('Sample data for 107 Ag [ He ] Conc. [ ppb ]:',
      //     allGraphData['107 Ag [ He ] Conc. [ ppb ]'].slice(0, 5));
      // }
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
  getQCGraphDataLastWeek
};