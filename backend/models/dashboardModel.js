const db = require('../initialize_db');
const QcCheckService = require('../services/qcCheckService');
const { MEconc, TEconc } = require('../colHeaders');

const ELEMENT_TABLES = { 1: MEconc, 2: TEconc };


function getTotalFilesCount(isAdmin, orgId) {
  const sql = `
    SELECT COUNT(*) AS count
    FROM uploaded_files f
    WHERE 
      (? = 1)                         -- admin: see everything
      OR (? = 0 AND f.org_id = ?)     -- non-admin: only their org
    AND f.hidden = 0
  `;
  return new Promise((resolve, reject) => {
    db.get(sql, [isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId], (err, row) => {
      if (err) return reject(err);
      resolve(row?.count || 0);
    });
  });
}

function getTotalSamplesCount(isAdmin, orgId) {
  const sql = `
    SELECT COUNT(DISTINCT sd.id) AS count
    FROM sample_data sd
    JOIN sample_id_X_file_id sx ON sd.id = sx.sample_id
    JOIN uploaded_files f ON sx.file_id = f.id
    WHERE 
      (? = 1)                         -- admin
      OR (? = 0 AND f.org_id = ?)     -- non-admin
    AND f.hidden = 0
  `;

  return new Promise((resolve, reject) => {
    db.get(sql, [isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId], (err, row) => {
      if (err) reject(err);
      else resolve(row?.count || 0);
    });
  });
}

async function getQCPassRate(isAdmin, orgId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT DISTINCT f.id, f.type, f.filename
      FROM uploaded_files f
      JOIN qc_data q ON f.id = q.file_id
      WHERE f.uploaded_at >= DATE('now', '-7 days')
        AND f.hidden = 0
        AND (
          (? = 1)                      -- admin
          OR (? = 0 AND f.org_id = ?)  -- non-admin
        )
        AND q."Solution Label" LIKE '%QC MES%'
    `;
    db.all(sql, [isAdmin ? 1 : 0, isAdmin ? 1 : 0, orgId], async (err, files) => {
      if (err) return reject(err);
      if (!files || files.length === 0) {
        return resolve({ passRate: 0, totalChecks: 0, passedChecks: 0 });
      }

      let totalChecks = 0;
      let passedChecks = 0;

      try {
        for (const file of files) {
          const solutionLabel = await QcCheckService.getSolutionLabelsForFile(file.id);
          if (!solutionLabel) continue;
          const qcSummary = await QcCheckService.getSummaryForQC(file.id, solutionLabel);
          totalChecks += qcSummary.totalElements;
          passedChecks += qcSummary.elementsWithinTolerance;
        }
        const passRate = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
        resolve({ passRate, totalChecks, passedChecks });
      } catch (error) {
        reject(error);
      }
    });
  });
}

function getQCGraphDataLastWeek(start, end, isAdmin, orgId) {
  const query = `
    SELECT q.*, f.type, f.uploaded_at, q.file_id
    FROM qc_data q
    JOIN uploaded_files f ON q.file_id = f.id
    WHERE f.uploaded_at BETWEEN ? AND ?
      AND f.hidden = 0
      AND (
        (? = 1)                         -- admin: see everything
        OR (? = 0 AND f.org_id = ?)     -- non-admin: only their org
      )
      AND q."Solution Label" LIKE 'QC%'
    ORDER BY f.uploaded_at ASC
  `;

  // Safe timestamp parser
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
    db.all(
      query,
      [
        start,
        end,
        isAdmin ? 1 : 0,   
        isAdmin ? 1 : 0,   
        orgId            
      ],
      (err, rows) => {
        if (err) return reject(err);

        const allGraphData = {};
        const uniqueFiles = new Set();

        for (const row of rows) {
          const fileType = row.type;
          const rawTimestamp = fileType === 2 ? row["Acq. Date-Time"] : row["Timestamp"];
          const timestamp = parseTimestamp(rawTimestamp);

          if (!timestamp) continue;

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
      }
    );
  });
}


async function getDashboardSummary(isAdmin, orgId) {
  const [totalFiles, totalSamples, qcStats] = await Promise.all([
    getTotalFilesCount(isAdmin, orgId),
    getTotalSamplesCount(isAdmin, orgId),
    getQCPassRate(isAdmin, orgId)
  ]);

  return {
    totalFiles,
    totalSamples,
    qcPassRate: qcStats.passRate,
    qcTotalChecks: qcStats.totalChecks,
    qcPassedChecks: qcStats.passedChecks
  };
}

module.exports = {
  getTotalFilesCount,
  getTotalSamplesCount,
  getQCPassRate,
  getDashboardSummary,
  getQCGraphDataLastWeek
};



