const path = require('path');
const fs = require('fs');
const db = require('../initialize_db');
const uploadService = require('../services/uploadService');

const projectRoot = path.join(__dirname, '..');

// -----------------------------------------------------
// Helper functions
// -----------------------------------------------------
function toRelative(p) {
  const rel = path.relative(projectRoot, p);
  return rel.split(path.sep).join('/');
}

function isCsv(file) {
  if (!file) return false;
  const okTypes = new Set(['text/csv', 'application/vnd.ms-excel']);
  const looksCsv = file.originalname?.toLowerCase().endsWith('.csv');
  return looksCsv || okTypes.has(file.mimetype);
}

function isPdf(file) {
  if (!file) return false;
  return (
    file.mimetype === 'application/pdf' ||
    file.originalname?.toLowerCase().endsWith('.pdf')
  );
}

// =====================================================
// Upload main CSV + PDF bundle
// =====================================================
const uploadFile = async (req, res) => {
  if (req.fileValidationError === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large (max 100MB).' });
  }

  // --- RBAC-aware org detection ---
  // let orgId = req?.rbac?.orgId;
  // let orgName = req.body?.orgName || null;
  // const userId = req?.rbac?.userId;
  // const isAdmin = req?.rbac?.isAdmin || false;

  // if (isAdmin) {
  //   // Prefer RBAC target orgId
  //   if (req?.rbac?.targetOrgId) orgId = req.rbac.targetOrgId;
  //   else if (req.query?.orgId) orgId = Number(req.query.orgId);
  // }

  // // Default org name lookup (if only ID provided)
  // if (!orgName && orgId) {
  //   const row = await new Promise((resolve) =>
  //     db.get(`SELECT name FROM organizations WHERE id = ?`, [orgId], (_, r) => resolve(r))
  //   );
  //   if (row) orgName = row.name;
  // }

  // if (!orgId && !orgName) {
  //   return res.status(401).json({ error: 'Unauthorized: missing org context.' });
  // }

  // const seasonRaw = req.body?.season || req.query?.season;
  // const season = ['pre_basalt', 'post_basalt'].includes((seasonRaw || '').toLowerCase())
  //   ? seasonRaw.toLowerCase()
  //   : 'pre_basalt';

  // --- RBAC-aware org and season handling ---
  let orgId = req?.rbac?.orgId || null;
  let orgName = req.body?.orgName?.trim() || null;
  const userId = req?.rbac?.userId;
  const isAdmin = req?.rbac?.isAdmin || false;

  // Admin override: prefer explicit target from frontend or query
  if (isAdmin) {
    // If frontend sent an org name (FormData field)
    if (req.body?.orgName) {
      orgName = req.body.orgName.trim();
    }

    // Allow admin to override via orgId in body or query
    if (req.query?.orgId || req.body?.orgId) {
      orgId = Number(req.query?.orgId || req.body?.orgId);
    }

    // Also support RBAC-provided targetOrgId
    if (req?.rbac?.targetOrgId) {
      orgId = req.rbac.targetOrgId;
    }
  }

  //  If only orgName provided → look up its ID
  if (orgName && !orgId) {
    const row = await new Promise((resolve) =>
      db.get(`SELECT id FROM organizations WHERE LOWER(name) = LOWER(?)`, [orgName], (_, r) => resolve(r))
    );
    if (row) orgId = row.id;
  }

  // If only orgId provided → look up its name
  if (!orgName && orgId) {
    const row = await new Promise((resolve) =>
      db.get(`SELECT name FROM organizations WHERE id = ?`, [orgId], (_, r) => resolve(r))
    );
    if (row) orgName = row.name;
  }

  //  Abort if both missing
  if (!orgId && !orgName) {
    return res.status(401).json({ error: 'Unauthorized: missing org context.' });
  }

  //  Handle season logic (retain your original behavior)
  const seasonRaw = req.body?.season || req.query?.season;
  const season = ['pre_basalt', 'post_basalt'].includes((seasonRaw || '').toLowerCase())
    ? seasonRaw.toLowerCase()
    : 'pre_basalt';


  // =====================================================
  // Validate files
  // =====================================================
  const isMultiUpload = !!req.files;
  const csvFile = isMultiUpload ? req.files?.csvfile?.[0] : req.file;
  const pdfFile = isMultiUpload ? req.files?.pdffile?.[0] : null;

  if (!csvFile) {
    if (pdfFile) fs.unlink(pdfFile.path, () => {});
    return res.status(400).json({ error: 'No CSV file uploaded.' });
  }
  if (isMultiUpload && !pdfFile) {
    fs.unlink(csvFile.path, () => {});
    return res.status(400).json({ error: 'A PDF file is required along with the CSV file.' });
  }
  if (!isCsv(csvFile)) {
    fs.unlink(csvFile.path, () => {});
    if (pdfFile) fs.unlink(pdfFile.path, () => {});
    return res.status(415).json({ error: 'Only CSV files are allowed for data.' });
  }
  if (pdfFile && !isPdf(pdfFile)) {
    fs.unlink(csvFile.path, () => {});
    fs.unlink(pdfFile.path, () => {});
    return res.status(415).json({ error: 'Only PDF files are allowed for report attachment.' });
  }

  const csvOriginalName = csvFile.originalname;
  const csvSavedPathAbs = csvFile.path;
  const pdfOriginalName = pdfFile ? pdfFile.originalname : null;
  const pdfSavedPathAbs = pdfFile ? pdfFile.path : null;
  const csvSavedPathRel = toRelative(csvSavedPathAbs);
  const pdfSavedPathRel = pdfSavedPathAbs ? toRelative(pdfSavedPathAbs) : null;

  // =====================================================
  // Begin transaction
  // =====================================================
  db.serialize(async () => {
    try {
      db.run('BEGIN TRANSACTION');

      const { error: validationError, samples, qc, csvType, headers } =
        await uploadService.validate(csvSavedPathAbs, csvOriginalName);
      if (validationError) throw new Error(validationError);

      const { error: insertError, fileId } = await uploadService.insertAllData(
        csvOriginalName,
        csvSavedPathRel,
        samples,
        qc,
        csvType,
        headers,
        pdfOriginalName,
        pdfSavedPathRel,
        orgId,
        userId,
        isAdmin,
        season,
        orgName
      );
      if (insertError) throw new Error(insertError);

      const { error: correctionError } = await uploadService.insertCorrected(
        fileId,
        csvType,
        headers
      );
      if (correctionError) throw new Error(correctionError);

      db.run('COMMIT', (err) => {
        if (err) throw new Error('Failed to commit transaction: ' + err.message);

        console.log(
          `✅ File(s) uploaded and processed successfully for org "${orgName || orgId}" (${season})`
        );

        return res.status(200).json({
          message: `File(s) uploaded and processed successfully for org "${orgName || orgId}".`,
          fileId,
          season,
          orgName,
        });
      });
    } catch (err) {
      console.error('[uploadFile] Transaction failed, rolling back. Error:', err?.message || err);
      db.run('ROLLBACK', () => {
        fs.unlink(csvSavedPathAbs, () => {});
        if (pdfSavedPathAbs) fs.unlink(pdfSavedPathAbs, () => {});
        if (err?.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large (max 100MB).' });
        }
        return res
          .status(500)
          .json({ error: err?.message || 'Database or CSV processing failed.' });
      });
    }
  });
};

// =====================================================
// Delete main bundle and attachments
// =====================================================
const deleteBundle = async (req, res) => {
  const { fileId } = req.params;
  try {
    await db.run(`DELETE FROM uploaded_files WHERE parent_id = ?`, [fileId]);
    await db.run(`DELETE FROM uploaded_files WHERE id = ?`, [fileId]);
    res.json({ success: true, message: 'Bundle deleted successfully.' });
  } catch (err) {
    console.error('Error deleting bundle:', err);
    res.status(500).json({ error: 'Failed to delete bundle.' });
  }
};

// =====================================================
// List all uploaded files for org
// =====================================================
const getFilesByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;
    const user = req.user || req.rbac;

    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!user.isAdmin && user.orgId !== Number(orgId))
      return res.status(403).json({ error: 'Forbidden' });

    const sql = `
      SELECT
        f.id, f.filename, f.file_path, f.pdfname, f.pdf_path, f.uploaded_at, f.type,
        f.org_id, o.name AS org_name, u.email AS uploader_email,
        f.season
      FROM uploaded_files f
      LEFT JOIN organizations o ON f.org_id = o.id
      LEFT JOIN users u ON f.created_by_user_id = u.id
      WHERE f.org_id = ? AND f.hidden = 0 AND f.type IN (1,2)
      ORDER BY f.uploaded_at DESC
    `;

    db.all(sql, [orgId], (err, rows) => {
      if (err) {
        console.error('[getFilesByOrg] DB error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows || []);
    });
  } catch (err) {
    console.error('[getFilesByOrg] Exception:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  uploadFile,
  getFilesByOrg,
  deleteBundle,
};



// const path = require('path');
// const fs = require('fs');
// const db = require('../initialize_db');
// const uploadService = require('../services/uploadService');

// const projectRoot = path.join(__dirname, '..');


// function toRelative(p) {
//   const rel = path.relative(projectRoot, p);
//   return rel.split(path.sep).join('/'); 
// }

// function isCsv(file) {
//   if (!file) return false;
//   const okTypes = new Set([
//     'text/csv',
//     'application/vnd.ms-excel', 
//   ]);
//   const looksCsv = file.originalname?.toLowerCase().endsWith('.csv');
//   return looksCsv || okTypes.has(file.mimetype);
// }

// function isPdf(file) {
//   if (!file) return false;
//   return (
//     file.mimetype === 'application/pdf' ||
//     file.originalname?.toLowerCase().endsWith('.pdf')
//   );
// }


// // =====================================================
// // Get all uploaded files for a specific organization
// // =====================================================

// const uploadFile = async (req, res) => {
//   if (req.fileValidationError === 'LIMIT_FILE_SIZE') {
//     return res.status(413).json({ error: 'File too large (max 100MB).' });
//   }

//   // --- RBAC-aware organization override (minimal change) ---
//   let orgId = req?.rbac?.orgId;
//   const userId = req?.rbac?.userId;
//   const isAdmin = req?.rbac?.isAdmin || false;

//   //  Allow admin override: if an admin selected an org via RBAC or query string
//   if (isAdmin) {
//     // If RBAC middleware sets targetOrgId, prefer that
//     if (req?.rbac?.targetOrgId) {
//       orgId = req.rbac.targetOrgId;
//     }
//     // Or allow ?orgId=2 from frontend
//     else if (req.query?.orgId) {
//       orgId = Number(req.query.orgId);
//     }
//   }

//   if (!orgId) {
//     return res.status(401).json({ error: 'Unauthorized: missing org context' });
//   }
//   const seasonRaw = req.body?.season || req.query?.season;
//   const season = ['pre_basalt', 'post_basalt'].includes((seasonRaw || '').toLowerCase())
//     ? seasonRaw.toLowerCase()
//     : 'pre_basalt';

//   // === Upload handling remains unchanged ===
//   const isMultiUpload = !!req.files;
//   const csvFile = isMultiUpload ? req.files?.csvfile?.[0] : req.file;
//   const pdfFile = isMultiUpload ? req.files?.pdffile?.[0] : null;

//   if (!csvFile) {
//     if (pdfFile) fs.unlink(pdfFile.path, () => {});
//     return res.status(400).json({ error: 'No CSV file uploaded.' });
//   }

//   if (isMultiUpload && !pdfFile) {
//     fs.unlink(csvFile.path, () => {});
//     return res.status(400).json({ error: 'A PDF file is required along with the CSV file.' });
//   }

//   if (!isCsv(csvFile)) {
//     fs.unlink(csvFile.path, () => {});
//     if (pdfFile) fs.unlink(pdfFile.path, () => {});
//     return res.status(415).json({ error: 'Only CSV files are allowed for data.' });
//   }

//   if (pdfFile && !isPdf(pdfFile)) {
//     fs.unlink(csvFile.path, () => {});
//     fs.unlink(pdfFile.path, () => {});
//     return res.status(415).json({ error: 'Only PDF files are allowed for report attachment.' });
//   }

//   const csvOriginalName = csvFile.originalname;
//   const csvSavedPathAbs = csvFile.path;
//   const pdfOriginalName = pdfFile ? pdfFile.originalname : null;
//   const pdfSavedPathAbs = pdfFile ? pdfFile.path : null;

//   const csvSavedPathRel = toRelative(csvSavedPathAbs);
//   const pdfSavedPathRel = pdfSavedPathAbs ? toRelative(pdfSavedPathAbs) : null;

//   db.serialize(async () => {
//     try {
//       db.run('BEGIN TRANSACTION');

//       const {
//         error: validationError,
//         samples,
//         qc,
//         csvType,
//         headers,
//       } = await uploadService.validate(csvSavedPathAbs, csvOriginalName);

//       if (validationError) throw new Error(validationError);

//       const {
//         error: insertError,
//         fileId,
//       } = await uploadService.insertAllData(
//         csvOriginalName,
//         csvSavedPathRel,
//         samples,
//         qc,
//         csvType,
//         headers,
//         pdfOriginalName,
//         pdfSavedPathRel,
//         orgId,       
//         userId,
//         isAdmin,
//         season
//       );

//       if (insertError) throw new Error(insertError);

//       const { error: correctionError } =
//         await uploadService.insertCorrected(fileId, csvType, headers);

//       if (correctionError) throw new Error(correctionError);

//       db.run('COMMIT', (err) => {
//         if (err) throw new Error('Failed to commit transaction: ' + err.message);
//         return res.status(200).json({
//           message: `File(s) uploaded and processed successfully for org ${orgId}`,
//           fileId,
//           season
//         });
//       });
//     } catch (err) {
//       console.error('[uploadFile] Transaction failed, rolling back. Error:', err?.message || err);
//       db.run('ROLLBACK', () => {
//         fs.unlink(csvSavedPathAbs, () => {});
//         if (pdfSavedPathAbs) fs.unlink(pdfSavedPathAbs, () => {});
//         if (err?.code === 'LIMIT_FILE_SIZE') {
//           return res.status(413).json({ error: 'File too large (max 100MB).' });
//         }
//         return res.status(500).json({ error: err?.message || 'Database or CSV processing failed' });
//       });
//     }
//   });
// };
// const deleteBundle = async (req, res) => {
//   const { fileId } = req.params;
//   try {
//     // 1. Delete all attachments linked to this main file
//     await db.run(`DELETE FROM uploaded_files WHERE parent_id = ?`, [fileId]);
    
//     // 2. Delete the main CSV/PDF record
//     await db.run(`DELETE FROM uploaded_files WHERE id = ?`, [fileId]);

//     res.json({ success: true, message: 'Bundle deleted successfully.' });
//   } catch (err) {
//     console.error('Error deleting bundle:', err);
//     res.status(500).json({ error: 'Failed to delete bundle.' });
//   }
// };

// const getFilesByOrg = async (req, res) => {
//   try {
//     const { orgId } = req.params;
//     const user = req.user || req.rbac;

//     if (!user) return res.status(401).json({ error: 'Unauthorized' });
//     if (!user.isAdmin && user.orgId !== Number(orgId))
//       return res.status(403).json({ error: 'Forbidden' });

//     const sql = `
//       SELECT
//         f.id, f.filename, f.file_path, f.pdfname, f.pdf_path, f.uploaded_at, f.type,
//         f.org_id, o.name AS org_name, u.email AS uploader_email,
//         f.season
//       FROM uploaded_files f
//       LEFT JOIN organizations o ON f.org_id = o.id
//       LEFT JOIN users u ON f.created_by_user_id = u.id
//       WHERE f.org_id = ? AND f.hidden = 0 AND f.type IN (1,2)
//       ORDER BY f.uploaded_at DESC
//     `;

//     db.all(sql, [orgId], (err, rows) => {
//       if (err) {
//         console.error('[getFilesByOrg] DB error:', err.message);
//         return res.status(500).json({ error: 'Database error' });
//       }
//       res.json(rows || []);
//     });
//   } catch (err) {
//     console.error('[getFilesByOrg] Exception:', err.message);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

// module.exports = { 
//   uploadFile,
//   getFilesByOrg,
//   deleteBundle
//  };
