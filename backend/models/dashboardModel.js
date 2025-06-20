const db = require('../initialize_db');// Assuming you have a database config

// ==========================
// 1. Total Uploaded Files Count
// ==========================
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

// ==========================
// 2. Total Samples Count
// ==========================
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

// ==========================
// 3. Files Uploaded in Past 7 Days
// ==========================
function getFilesUploadedThisWeek() {
  const sql = `
    SELECT COUNT(*) AS count
    FROM uploaded_files
    WHERE hidden = 0 AND DATE(uploaded_at) >= DATE('now', '-7 days')
  `;
  return new Promise((resolve, reject) => {
    db.get(sql, [], (err, row) => {
      if (err) {
        console.error('Error getting files uploaded this week:', err);
        return reject(err);
      }
      resolve(row?.count || 0);
    });
  });
}

// ==========================
// 4. QC Data for Past Week
// ==========================
function getQCDataPastWeek() {
  const sql = `
    SELECT 
      DATE(uploaded_files.uploaded_at) AS date,
      qc_data.file_id,
      qc_data."Solution Label" AS solution_label,
      uploaded_files.type AS file_type,
      uploaded_files.uploaded_at
    FROM qc_data
    JOIN uploaded_files ON qc_data.file_id = uploaded_files.id
    WHERE uploaded_files.uploaded_at >= DATE('now', '-7 days')
      AND qc_data."Solution Label" LIKE '%QC MES%'
    ORDER BY uploaded_files.uploaded_at ASC
  `;
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error getting QC data for past week:', err);
        return reject(err);
      }
      resolve(rows || []);
    });
  });
}

// ==========================
// 5. QC Stats for Past Week
// ==========================
function getQCStatsForWeek() {
  const sql = `
    SELECT 
      DATE(uploaded_files.uploaded_at) AS date,
      COUNT(*) AS total_qc_runs,
      uploaded_files.type AS file_type
    FROM qc_data
    JOIN uploaded_files ON qc_data.file_id = uploaded_files.id
    WHERE uploaded_files.uploaded_at >= DATE('now', '-7 days')
      AND qc_data."Solution Label" LIKE '%QC MES%'
    GROUP BY DATE(uploaded_files.uploaded_at), uploaded_files.type
    ORDER BY date ASC
  `;
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error getting QC stats for week:', err);
        return reject(err);
      }
      resolve(rows || []);
    });
  });
}

// ==========================
// 6. Recent Files (Limited)
// ==========================
function getRecentFiles(limit = 5) {
  const sql = `
    SELECT 
      id,
      filename AS original_name,
      type,
      uploaded_at AS created_at
    FROM uploaded_files
    WHERE hidden = 0
    ORDER BY uploaded_at DESC
    LIMIT ?
  `;
  return new Promise((resolve, reject) => {
    db.all(sql, [limit], (err, rows) => {
      if (err) {
        console.error('Error getting recent files:', err);
        return reject(err);
      }
      resolve(rows || []);
    });
  });
}

// ==========================
// 7. Dashboard Summary
// ==========================
async function getDashboardSummary() {
  try {
    const [totalFiles, totalSamples, weeklyFiles] = await Promise.all([
      getTotalFilesCount(),
      getTotalSamplesCount(),
      getFilesUploadedThisWeek()
    ]);

    return {
      totalFiles,
      totalSamples,
      weeklyFiles
    };
  } catch (err) {
    console.error('Error getting dashboard summary:', err);
    throw err;
  }
}

// ==========================
// Export
// ==========================
module.exports = {
  getTotalFilesCount,
  getTotalSamplesCount,
  getFilesUploadedThisWeek,
  getQCDataPastWeek,
  getQCStatsForWeek,
  getRecentFiles,
  getDashboardSummary
};
