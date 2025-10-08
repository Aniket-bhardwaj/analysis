const fileModel = require("../models/fileModel");

const listFiles = async (req, res) => {
  try {
    // RBAC context (set by app.js attachRBAC)
    const { isAdmin, orgId } = req.rbac;

    // Admins see all; non-admins see only their org’s visible files
    const rows = await fileModel.listFilesForUser(isAdmin, orgId);

    const transformedFiles = rows.map((file) => {
      const ext = (file.filename || "").split(".").pop() || "";
      const ownerEmail = file.owner_email || null;

      return {
        id: file.id,
        name: file.filename,
        type: ext.toUpperCase(),

        // owner info from the join
        user: ownerEmail || "Unknown",
        email: ownerEmail || "unknown@example.com",
        ownerId: file.created_by_user_id ?? null,

        // org info from the join
        orgId: file.org_id ?? null,
        orgName: file.org_name || (file.org_id != null ? `Org ${file.org_id}` : "Unknown"),

        uploadDate: new Date(file.uploaded_at)
          .toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace(",", ""),
        status: "Uploaded",
        pdfname: file.pdfname || null,
        hasPdf: !!file.pdf_path,
      };
    });

    res.json(transformedFiles);
  } catch (err) {
    console.error("DB fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch files" });
  }
};

module.exports = { listFiles };


