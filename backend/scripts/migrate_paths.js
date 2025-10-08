// backend/scripts/migrate_paths.js
const db = require('../initialize_db');

function normalize(p) {
  if (!p) return p;
  // If already relative, leave it
  if (!p.includes('uploads')) return p;
  // Extract the part from "uploads" onward
  const idx = p.indexOf('uploads');
  if (idx >= 0) {
    return p.substring(idx).replace(/\\/g, '/'); // force forward slashes
  }
  return p;
}

db.serialize(() => {
  db.all('SELECT id, path, pdf_path FROM uploaded_files', (err, rows) => {
    if (err) throw err;
    let updated = 0;
    rows.forEach(r => {
      const newPath = normalize(r.path);
      const newPdf = normalize(r.pdf_path);
      if (newPath !== r.path || newPdf !== r.pdf_path) {
        db.run(
          'UPDATE uploaded_files SET path = ?, pdf_path = ? WHERE id = ?',
          [newPath, newPdf, r.id],
          (e) => { if (!e) updated++; }
        );
      }
    });
    setTimeout(() => {
      console.log('Migration done. Rows updated:', updated);
      process.exit(0);
    }, 500);
  });
});
