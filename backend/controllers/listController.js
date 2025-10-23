const fileModel = require("../models/fileModel");

const listFiles = async (req, res) => {
  try {
    const { isAdmin, orgId } = req.rbac;
    const rows = await fileModel.listFilesForUser(isAdmin, orgId);

    // Exclude attachments (type 3 or stored under uploads/attachments)
    const filtered = rows.filter(f =>
      (f.type === 1 || f.type === 2) &&
      !(f.file_path && f.file_path.includes("uploads/attachments/"))
    );

    const transformedFiles = filtered.map((file) => {
      const ext = (file.filename || "").split(".").pop() || "";
      const ownerEmail = file.owner_email || "unknown@example.com";

      return {
        id: file.id,
        name: file.filename,
        type: ext.toUpperCase(),
        user: ownerEmail,
        email: ownerEmail,
        ownerId: file.created_by_user_id ?? null,
        orgId: file.org_id ?? null,
        orgName: file.org_name || (file.org_id ? `Org ${file.org_id}` : "Unknown"),
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
        season: file.season || "pre_basalt", 
        seasonLabel:
          file.season === "post_basalt"
            ? "Post Basalt"
            : file.season === "pre_basalt"
            ? "Pre Basalt"
            : "Unspecified", 
      };
    });

    res.json(transformedFiles);
  } catch (err) {
    console.error("DB fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch files" });
  }
};

module.exports = { listFiles };



//  const fileModel = require("../models/fileModel");

// const listFiles = async (req, res) => {
//   try {
//     const { isAdmin, orgId } = req.rbac;
//     const rows = await fileModel.listFilesForUser(isAdmin, orgId);

//     // 🚫 Exclude attachments (type 3 or stored under uploads/attachments)
//     const filtered = rows.filter(f =>
//       (f.type === 1 || f.type === 2) &&
//       !(f.file_path && f.file_path.includes("uploads/attachments/"))
//     );

//     const transformedFiles = filtered.map((file) => {
//       const ext = (file.filename || "").split(".").pop() || "";
//       const ownerEmail = file.owner_email || "unknown@example.com";

//       return {
//         id: file.id,
//         name: file.filename,
//         type: ext.toUpperCase(),
//         user: ownerEmail,
//         email: ownerEmail,
//         ownerId: file.created_by_user_id ?? null,
//         orgId: file.org_id ?? null,
//         orgName: file.org_name || (file.org_id ? `Org ${file.org_id}` : "Unknown"),
//         uploadDate: new Date(file.uploaded_at)
//           .toLocaleString("en-GB", {
//             day: "2-digit",
//             month: "2-digit",
//             year: "numeric",
//             hour: "2-digit",
//             minute: "2-digit",
//           })
//           .replace(",", ""),
//         status: "Uploaded",
//         pdfname: file.pdfname || null,
//         hasPdf: !!file.pdf_path,
//       };
//     });

//     res.json(transformedFiles);
//   } catch (err) {
//     console.error("DB fetch error:", err.message);
//     res.status(500).json({ error: "Failed to fetch files" });
//   }
// };

// module.exports = { listFiles };
