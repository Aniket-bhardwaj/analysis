// backend/controllers/previewController.js
const fileModel = require("../models/fileModel");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");

const projectRoot = path.join(__dirname, "..");

// Resolve a DB-stored path (usually relative like "uploads/...") to absolute
function resolveFilePath(stored) {
  if (!stored) return null;
  if (path.isAbsolute(stored)) return stored;
  return path.join(projectRoot, stored);
}

const previewFile = async (req, res) => {
  const { fileName } = req.params; // original filename as stored in DB

  try {
    // Use RBAC context provided by attachRBAC in app.js
    const isAdmin = !!req.rbac?.isAdmin;
    const orgId = req.rbac?.orgId;

    // RBAC-aware lookup
    const file = await fileModel.getFileByNameForUser(fileName, isAdmin ? 1 : 0, orgId);
    if (!file) {
      // 404 to avoid leaking existence on forbidden
      return res.status(404).json({ error: "Access denied or file not found" });
    }

    const absCsvPath = resolveFilePath(file.path);
    if (!absCsvPath || !fs.existsSync(absCsvPath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    const results = [];
    let responded = false;

    const finish = () => {
      if (responded) return;
      responded = true;
      res.json(results);
    };

    const readStream = fs.createReadStream(absCsvPath);
    readStream
      .on("error", (err) => {
        if (responded) return;
        console.error("[preview] read error:", err?.message || err);
        responded = true;
        res.status(500).json({ error: "Failed to read CSV" });
      })
      .pipe(csv())
      .on("data", (row) => {
        if (results.length < 5) {
          results.push(row);
          if (results.length === 5) {
            // stop early to save IO
            readStream.destroy();
          }
        }
      })
      .on("close", finish)
      .on("end", finish)
      .on("error", (err) => {
        if (responded) return;
        console.error("[preview] CSV parse error:", err?.message || err);
        responded = true;
        res.status(500).json({ error: "Failed to parse CSV" });
      });
  } catch (err) {
    console.error("[preview] error:", err?.message || err);
    return res.status(500).json({ error: "Database operation failed" });
  }
};

module.exports = { previewFile };

