// backend/controllers/downloadController.js
const path = require("path");
const fs = require("fs");

const DownloadService = require("../services/downloadService");
const fileModel = require("../models/fileModel"); // exposes getFileByIdForUser

// /**
//  * Resolve a DB-stored path (usually relative like "uploads/..")
//  * to an absolute path on disk (relative to backend/).
//  */
function resolveFilePath(p) {
  if (!p) return null;
  if (path.isAbsolute(p)) return p;
  return path.join(__dirname, "..", p);
}

/**
 * POST /api/download-file/:id   (your FE uses POST)
 * Generates a ZIP containing:
 *  - original CSV (renamed *_RAW.csv)
 *  - Passed_Elements.csv
 *  - Failed_Elements.csv
 *  - All_Elements_Corrected.csv
 *  - (PDF is included by DownloadService if present)
 */
exports.downloadFile = async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const isAdmin = !!req.rbac?.isAdmin;
    const orgId = req.rbac?.orgId;

    // RBAC gate: ensure caller can access this file
    const fileRow = await fileModel.getFileByIdForUser(fileId, isAdmin, orgId);
    if (!fileRow) {
      // 404 to avoid leaking existence
      return res.status(404).json({ error: "Access denied or file not found" });
    }

    // Create the zip (pass minimal caller context if your service needs it)
    const { buffer, filename } = await DownloadService.createZipWithCSVs(
      fileId,
      { userId: req.rbac?.userId, orgId, isAdmin: !!isAdmin }
    );

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });

    return res.send(buffer);
  } catch (err) {
    console.error("[downloadFile] error:", err);
    return res.status(500).json({ error: "Failed to download file" });
  }
};

/**
 * POST /api/download-pdf/:id    (your FE uses POST)
 * Streams the PDF uploaded alongside the CSV, if present.
 */
exports.downloadPdf = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const isAdmin = !!req.rbac?.isAdmin;
    const orgId = req.rbac?.orgId;

    if (!fileModel.getFileByIdForUser) {
      return res.status(500).json({ error: "RBAC lookup not implemented" });
    }

    const fileRow = await fileModel.getFileByIdForUser(id, isAdmin, orgId);
    if (!fileRow || !fileRow.pdf_path) {
      return res.status(404).json({ error: "PDF not found or access denied" });
    }

    const absPath = resolveFilePath(fileRow.pdf_path);
    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(404).json({ error: "PDF file missing on server" });
    }

    const downloadName = fileRow.pdfname || path.basename(absPath) || "report.pdf";
    return res.download(absPath, downloadName);
  } catch (err) {
    console.error("[downloadPdf] error:", err);
    return res.status(500).json({ error: "Failed to download PDF" });
  }
};

