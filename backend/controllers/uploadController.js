const path = require('path');
const fs = require('fs');
const db = require('../initialize_db');
const uploadService = require('../services/uploadService');

const projectRoot = path.join(__dirname, '..');


function toRelative(p) {
  const rel = path.relative(projectRoot, p);
  return rel.split(path.sep).join('/'); 
}

function isCsv(file) {
  if (!file) return false;
  const okTypes = new Set([
    'text/csv',
    'application/vnd.ms-excel', 
  ]);
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


const uploadFile = async (req, res) => {

  if (req.fileValidationError === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large (max 100MB).' });
  }


  const orgId = req?.rbac?.orgId;
  const userId = req?.rbac?.userId;
  if (!orgId) {
     return res.status(401).json({ error: 'Unauthorized: missing org context' });
  }

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


  db.serialize(async () => {
    try {
      db.run('BEGIN TRANSACTION');


      const {
        error: validationError,
        samples,
        qc,
        csvType,
        headers,
      } = await uploadService.validate(csvSavedPathAbs, csvOriginalName);

      if (validationError) {
        throw new Error(validationError);
      }

      const isAdmin = req?.rbac?.isAdmin || false;

      const {
        error: insertError,
        fileId,
      } = await uploadService.insertAllData(
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
        isAdmin          
      );

      if (insertError) {
        throw new Error(insertError);
      }

  
      const { error: correctionError } =
        await uploadService.insertCorrected(fileId, csvType, headers);

      if (correctionError) {
        throw new Error(correctionError);
      }


      db.run('COMMIT', (err) => {
        if (err) throw new Error('Failed to commit transaction: ' + err.message);
        return res.status(200).json({
          message: 'File(s) uploaded and processed successfully',
          fileId,
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
        return res.status(500).json({ error: err?.message || 'Database or CSV processing failed' });
      });
    }
  });
};
// =====================================================
// Get all uploaded files for a specific organization
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
        f.org_id, o.name AS org_name, u.email AS uploader_email
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
  getFilesByOrg

 };

