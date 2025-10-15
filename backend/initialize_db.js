const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");
const {
  completeHeaders,
  qcHeaders,
  rest_dataHeaders,
  OTstdcleaned,
  OMstdcleaned,
} = require("./colHeaders");
const { Tval, Terr, Merr, Mval } = require("./Oheaders");

const dbPath = path.resolve(__dirname, "database.sqlite");

// Connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("SQLite connection error:", err.message);
  } else {
    console.log("Connected to SQLite database!");
  }
});

// Safety + performance
db.run("PRAGMA foreign_keys = ON");
db.run("PRAGMA journal_mode = WAL");

db.serialize(() => {
  // ---------------------------
  // Table: organizations
  // ---------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  // ---------------------------
  // Table: uploaded_files
  // ---------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      pdfname TEXT NOT NULL,
      pdf_path TEXT NOT NULL,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      type INTEGER NOT NULL,
      hidden INTEGER DEFAULT 0,
      org_id INTEGER NOT NULL,
      created_by_user_id INTEGER,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // ---------------------------
  // Table: sample_data
  // ---------------------------
  const colsDef = completeHeaders
    .map((col) => (col === "Solution Label" ? `"${col}" TEXT` : `"${col}" TEXT`))
    .join(", ");

  db.run(`
    CREATE TABLE IF NOT EXISTS sample_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      ${colsDef},
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )
  `);


  // ---------------------------
  // Mapping table sample_id_X_file_id
  // ---------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS sample_id_X_file_id (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      FOREIGN KEY (sample_id) REFERENCES sample_data(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )
  `);

  // ---------------------------
  // Table: qc_data
  // ---------------------------
  const colsDef2 = qcHeaders.map((col) => `"${col}" TEXT`).join(", ");

  db.run(`
    CREATE TABLE IF NOT EXISTS qc_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,

      -- dynamic QC CSV headers (includes "Solution Label")
      ${colsDef2},

      -- row-wise computed stats
      element TEXT,
      fullElementName TEXT,
      valueAvg REAL,
      correctedValueAvg REAL,
      rsd REAL,
      errorPercentage REAL,
      isWithinTolerance BOOLEAN,
      isNotWithinTolerance BOOLEAN,
      errorFactor REAL,
      rowType TEXT DEFAULT 'raw',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )
  `);

  // ---------------------------
  // Table: rest_data
  // ---------------------------
  const colsDef3 = rest_dataHeaders.map((col) => `"${col}" TEXT`).join(", ");
  db.run(`
    CREATE TABLE IF NOT EXISTS rest_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      ${colsDef3},
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_rest_data_file_id ON rest_data(file_id)`);

  // ---------------------------
  // Table: sjs
  // ---------------------------

  // Merge trace + major element names
  const allCols = [...OTstdcleaned, ...OMstdcleaned];
  const columnDefs = allCols.map(col => `"${col}" TEXT`).join(', ');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS sjs (
      id INTEGER PRIMARY KEY,
      label TEXT NOT NULL,
      ${columnDefs}
    );
  `;

  db.run(createTableSQL, (err) => {
    if (err) return console.error('❌ Error creating sjs table:', err);
    console.log('✅ sjs table created.');

    // Prepare insert query with 81 placeholders (1 id + 1 label + 61 + 18 = 81)
    const placeholders = Array(allCols.length + 2).fill('?').join(', ');
    const insertSQL = `INSERT OR IGNORE INTO sjs VALUES (${placeholders})`;

    // Build the rows
    const row1 = [1, 'SJS-Std', ...Tval, ...Mval];
    const row2 = [2, 'Error', ...Terr, ...Merr];

    // Insert both rows
    db.run(insertSQL, row1, (err) => {
      if (err) {
          console.error('❌ Error inserting Row 1 (SJS-Std):', err.message);
      } else if (this.changes > 0) {
          console.log('✅ Row 1 (SJS-Std) inserted');
      }
    });

    db.run(insertSQL, row2, (err) => {
        if (err) {
            console.error('❌ Error inserting Row 2 (Error):', err.message);
        } else if (this.changes > 0) {
            console.log('✅ Row 2 (Error) inserted');
        }
    });
  });



  // ---------------------------
  // Table: users
  // ---------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      is_admin INTEGER DEFAULT 0,
      must_change_password INTEGER DEFAULT 0,
      org_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
    )
  `);

  // ---------------------------
  // Helpful indexes
  // ---------------------------
  db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_org_hidden ON uploaded_files (org_id, hidden)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_by ON uploaded_files (created_by_user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_at ON uploaded_files (uploaded_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_qc_data_file_id ON qc_data (file_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sample_map_file_id ON sample_id_X_file_id (file_id)`);

  // ---------------------------
  // Seed default organizations
  // ---------------------------
  db.run(`INSERT OR IGNORE INTO organizations (id, name) VALUES (1, 'Main Lab')`);
  db.run(`INSERT OR IGNORE INTO organizations (id, name) VALUES (2, 'Client Lab A')`);
  db.run(`INSERT OR IGNORE INTO organizations (id, name) VALUES (3, 'Client Lab B')`);
  
  // ---------------------------
  // Seed users
  // ---------------------------
  const seedUser = async (email, plainPassword, isAdmin, mustChange, orgId) => {
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
      if (err) return console.error("Error checking for user:", err.message);
      if (!row) {
        try {
          const hashedPassword = await bcrypt.hash(plainPassword, 10);
          db.run(
            `INSERT INTO users (email, password, is_admin, must_change_password, org_id)
             VALUES (?, ?, ?, ?, ?)`,
            [email, hashedPassword, isAdmin ? 1 : 0, mustChange ? 1 : 0, orgId],
            (err) => {
              if (err) console.error("Insert error:", err.message);
              else console.log(`Inserted user: ${email}`);
            }
          );
        } catch (e) {
          console.error("Hash error:", e.message);
        }
      } else {
        console.log(`User already exists: ${email}`);
      }
    });
  };

  // Admin (org 1)
  seedUser("admin@gmail.com", "Admin1", true, false, 1);

  // Client 1 (org 2)
  seedUser("client1@gmail.com", "Client1", false, false, 2);

  // Client 2 (org 3)
  seedUser("client2@gmail.com", "Client2", false, false, 3);
});

module.exports = db;

// // initialize_db.js
// const sqlite3 = require("sqlite3").verbose();
// const path = require("path");
// const bcrypt = require("bcryptjs");
// const {
//   completeHeaders,
//   qcHeaders,
//   rest_dataHeaders,
//   OTstdcleaned,
//   OMstdcleaned,
// } = require("./colHeaders");
// const { Tval, Terr, Merr, Mval } = require("./Oheaders");

// const dbPath = path.resolve(__dirname, "database.sqlite");

// // Connect to SQLite database
// const db = new sqlite3.Database(dbPath, (err) => {
//   if (err) {
//     console.error("SQLite connection error:", err.message);
//   } else {
//     console.log("Connected to SQLite database!");
//   }
// });

// // Safety + performance
// db.run("PRAGMA foreign_keys = ON");
// db.run("PRAGMA journal_mode = WAL");

// db.serialize(() => {
//   // ---------------------------
//   // Table: organizations
//   // ---------------------------
//   db.run(`
//     CREATE TABLE IF NOT EXISTS organizations (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL UNIQUE
//     )
//   `);

//   // ---------------------------
//   // Table: uploaded_files
//   // ---------------------------
//   db.run(`
//     CREATE TABLE IF NOT EXISTS uploaded_files (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       filename TEXT NOT NULL,
//       path TEXT NOT NULL,
//       pdfname TEXT NOT NULL,
//       pdf_path TEXT NOT NULL,
//       uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       type INTEGER NOT NULL,
//       hidden INTEGER DEFAULT 0,
//       org_id INTEGER,
//       created_by_user_id INTEGER,
//       FOREIGN KEY (org_id) REFERENCES organizations(id),
//       FOREIGN KEY (created_by_user_id) REFERENCES users(id)
//     )
//   `);

//   // ---------------------------
//   // Table: sample_data
//   // ---------------------------
//   const colsDef = completeHeaders
//     .map((col) => (col === "Solution Label" ? `"${col}" TEXT UNIQUE` : `"${col}" TEXT`))
//     .join(", ");

//   db.run(`
//     CREATE TABLE IF NOT EXISTS sample_data (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       ${colsDef}
//     )
//   `);

//   // ---------------------------
//   // Mapping table sample_id_X_file_id
//   // ---------------------------
//   db.run(`
//     CREATE TABLE IF NOT EXISTS sample_id_X_file_id (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       sample_id INTEGER NOT NULL,
//       file_id INTEGER NOT NULL,
//       FOREIGN KEY (sample_id) REFERENCES sample_data(id) ON DELETE CASCADE,
//       FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
//     )
//   `);

//   // ---------------------------
//   // Table: qc_data
//   // ---------------------------
//   const colsDef2 = qcHeaders.map((col) => `"${col}" TEXT`).join(", ");
//   db.run(`
//     CREATE TABLE IF NOT EXISTS qc_data (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       file_id INTEGER NOT NULL,
//       ${colsDef2},
//       FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
//     )
//   `);

//   // ---------------------------
//   // Table: rest_data
//   // ---------------------------
//   const colsDef3 = rest_dataHeaders.map((col) => `"${col}" TEXT`).join(", ");
//   db.run(`
//     CREATE TABLE IF NOT EXISTS rest_data (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       ${colsDef3}
//     )
//   `);

//   // ---------------------------
//   // Table: sjs
//   // ---------------------------
//   const allCols = [...OTstdcleaned, ...OMstdcleaned];
//   const columnDefs = allCols.map((col) => `"${col}" TEXT`).join(", ");

//   db.run(
//     `CREATE TABLE IF NOT EXISTS sjs (
//       id INTEGER PRIMARY KEY,
//       label TEXT NOT NULL,
//       ${columnDefs}
//     )`,
//     (err) => {
//       if (err) return console.error("❌ Error creating sjs table:", err);
//       console.log("sjs table created.");

//       const placeholders = Array(allCols.length + 2).fill("?").join(", ");
//       const insertSQL = `INSERT OR IGNORE INTO sjs VALUES (${placeholders})`;

//       const row1 = [1, "SJS-Std", ...Tval, ...Mval];
//       const row2 = [2, "Error", ...Terr, ...Merr];

//       db.run(insertSQL, row1, function (err) {
//         if (err) console.error("❌ Error inserting Row 1:", err.message);
//         else if (this.changes > 0) console.log("Row 1 inserted");
//       });

//       db.run(insertSQL, row2, function (err) {
//         if (err) console.error("❌ Error inserting Row 2:", err.message);
//         else if (this.changes > 0) console.log("Row 2 inserted");
//       });
//     }
//   );

//   // ---------------------------
//   // Table: users
//   // ---------------------------
//   db.run(`
//     CREATE TABLE IF NOT EXISTS users (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       email TEXT UNIQUE,
//       password TEXT,
//       is_admin INTEGER DEFAULT 0,
//       must_change_password INTEGER DEFAULT 0,
//       org_id INTEGER,
//       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (org_id) REFERENCES organizations(id)
//     )
//   `);

//   // ---------------------------
//   // Helpful indexes
//   // ---------------------------
//   db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_org_hidden ON uploaded_files (org_id, hidden)`);
//   db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_by ON uploaded_files (created_by_user_id)`);
//   db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_at ON uploaded_files (uploaded_at)`);
//   db.run(`CREATE INDEX IF NOT EXISTS idx_qc_data_file_id ON qc_data (file_id)`);
//   db.run(`CREATE INDEX IF NOT EXISTS idx_sample_map_file_id ON sample_id_X_file_id (file_id)`);

//   // ---------------------------
//   // Seed default organizations (unique names required)
//   // ---------------------------
//   db.run(`INSERT OR IGNORE INTO organizations (id, name) VALUES (1, 'Main Lab')`);
//   db.run(`INSERT OR IGNORE INTO organizations (id, name) VALUES (2, 'Client Lab A')`);
//   db.run(`INSERT OR IGNORE INTO organizations (id, name) VALUES (3, 'Client Lab B')`);

//   // ---------------------------
//   // Seed users (as requested)
//   //   - admin@gmail.com  / Admin1   (org 1, admin)
//   //   - client1@gmail.com /   (org 2)
//   //   - client2@gmail.com / Client2 (org 3)
//   // ---------------------------
//   const seedUser = async (email, plainPassword, isAdmin, mustChange, orgId) => {
//     db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
//       if (err) return console.error("Error checking for user:", err.message);
//       if (!row) {
//         try {
//           const hashedPassword = await bcrypt.hash(plainPassword, 10);
//           db.run(
//             `INSERT INTO users (email, password, is_admin, must_change_password, org_id)
//              VALUES (?, ?, ?, ?, ?)`,
//             [email, hashedPassword, isAdmin ? 1 : 0, mustChange ? 1 : 0, orgId],
//             (err) => {
//               if (err) console.error("Insert error:", err.message);
//               else console.log(`Inserted user: ${email}`);
//             }
//           );
//         } catch (e) {
//           console.error("Hash error:", e.message);
//         }
//       } else {
//         console.log(`User already exists: ${email}`);
//       }
//     });
//   };

//   // Admin (org 1)
//   seedUser("admin@gmail.com", "Admin1", true, false, 1);

//   // Client 1 (org 2)
//   seedUser("client1@gmail.com", "Client1", false, false, 2);

//   // Client 2 (org 3)
//   seedUser("client2@gmail.com", "Client2", false, false, 3);
// });

// module.exports = db;

