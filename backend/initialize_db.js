// ==========================================================
// initialize_db.js — Production-Grade Self-Healing Schema
// ==========================================================
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

// ----------------------------------------------------
// Database Connection
// ----------------------------------------------------
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ SQLite connection error:", err.message);
  else console.log("✅ Connected to SQLite database!");
});

// Global safeguard for runtime DB errors
db.on("error", (err) => {
  if (err?.message?.includes("duplicate column name: parent_id")) {
    console.log("⚠️ parent_id already exists (ignored).");
  } else {
    console.error(" SQLite emitted an error:", err.message);
  }
});

// Performance tuning
db.run("PRAGMA foreign_keys = ON");
db.run("PRAGMA journal_mode = WAL");

// ----------------------------------------------------
// Base Schema Creation
// ----------------------------------------------------
db.serialize(() => {
  // 1️⃣ Organizations
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  // 2️⃣ Uploaded Files
  db.run(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      file_path TEXT,
      pdfname TEXT,
      pdf_path TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      type INTEGER DEFAULT 1,
      hidden INTEGER DEFAULT 0,
      org_id INTEGER DEFAULT 1,
      created_by_user_id INTEGER,
      parent_id INTEGER DEFAULT NULL,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // 3️⃣ Sample Data
  const colsDef = completeHeaders.map((col) => `"${col}" TEXT`).join(", ");
  db.run(`
    CREATE TABLE IF NOT EXISTS sample_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      ${colsDef},
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )
  `);

  // 4️⃣ Mapping Table
  db.run(`
    CREATE TABLE IF NOT EXISTS sample_id_X_file_id (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      FOREIGN KEY (sample_id) REFERENCES sample_data(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )
  `);

  // 5️⃣ QC Data
  const colsDef2 = qcHeaders.map((col) => `"${col}" TEXT`).join(", ");
  db.run(`
    CREATE TABLE IF NOT EXISTS qc_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      ${colsDef2},
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

  // 6️⃣ Rest Data
  const colsDef3 = rest_dataHeaders.map((col) => `"${col}" TEXT`).join(", ");
  db.run(`
    CREATE TABLE IF NOT EXISTS rest_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      ${colsDef3},
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )
  `);

  // 7️⃣ SJS Table
  const allCols = [...OTstdcleaned, ...OMstdcleaned];
  const columnDefs = allCols.map((col) => `"${col}" TEXT`).join(", ");
  db.run(
    `CREATE TABLE IF NOT EXISTS sjs (
      id INTEGER PRIMARY KEY,
      file_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      ${columnDefs},
      error_pct REAL,
      tolerance_pct REAL,
      rsd_pct REAL,
      status TEXT,
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) console.error("Error creating sjs table:", err.message);
      else console.log("sjs table created.");
    }
  );

  // 8️⃣ Users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      is_admin INTEGER DEFAULT 0,
      must_change_password INTEGER DEFAULT 0,
      org_id INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
    )
  `);
});

// ----------------------------------------------------
// 💪 UNIVERSAL AUTO-MIGRATOR (Full Self-Healing Schema)
// ----------------------------------------------------
db.serialize(() => {
  console.log("🔧 Running universal auto-migration (tables + columns)…");

  const schemaMap = {
    organizations: {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      name: "TEXT UNIQUE NOT NULL"
    },
    users: {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      email: "TEXT UNIQUE",
      password: "TEXT",
      is_admin: "INTEGER DEFAULT 0",
      must_change_password: "INTEGER DEFAULT 0",
      org_id: "INTEGER DEFAULT 1",
      created_at: "DATETIME DEFAULT CURRENT_TIMESTAMP"
    },
    uploaded_files: {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      filename: "TEXT",
      file_path: "TEXT",
      pdfname: "TEXT",
      pdf_path: "TEXT",
      uploaded_at: "TEXT DEFAULT CURRENT_TIMESTAMP",
      type: "INTEGER DEFAULT 1",
      hidden: "INTEGER DEFAULT 0",
      org_id: "INTEGER DEFAULT 1",
      created_by_user_id: "INTEGER DEFAULT NULL",
      parent_id: "INTEGER DEFAULT NULL"
    },
    sample_data: {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      file_id: "INTEGER NOT NULL"
    },
    qc_data: {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      file_id: "INTEGER NOT NULL",
      rowType: "TEXT DEFAULT 'raw'",
      created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    },
    rest_data: {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      file_id: "INTEGER NOT NULL"
    },
    sjs: {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      file_id: "INTEGER NOT NULL",
      label: "TEXT",
      error_pct: "REAL",
      tolerance_pct: "REAL",
      rsd_pct: "REAL",
      status: "TEXT"
    }
  };

  const ensureTable = (table, columns) => {
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [table],
      (err, row) => {
        if (err) {
          console.error(`❌ Error checking table ${table}:`, err.message);
          return;
        }

        if (!row) {
          const colsSQL = Object.entries(columns)
            .map(([name, type]) => `${name} ${type}`)
            .join(", ");
          db.run(`CREATE TABLE IF NOT EXISTS ${table} (${colsSQL})`, e2 => {
            if (e2) console.error(`❌ Failed to create ${table}:`, e2.message);
            else console.log(`🆕 Created new table: ${table}`);
          });
          return;
        }

        db.all(`PRAGMA table_info(${table})`, (err2, existingCols) => {
          if (err2) {
            console.error(`❌ Failed to inspect ${table}:`, err2.message);
            return;
          }
          const existingNames = existingCols.map(c => c.name);
          Object.entries(columns).forEach(([col, def]) => {
            if (!existingNames.includes(col)) {
              const alterSQL = `ALTER TABLE ${table} ADD COLUMN ${col} ${def}`;
              db.run(alterSQL, e3 => {
                if (e3 && !e3.message.includes("duplicate column name")) {
                  console.error(`❌ ${table}: failed to add '${col}' →`, e3.message);
                } else {
                  console.log(`✅ ${table}: ensured column '${col}'`);
                }
              });
            }
          });
        });
      }
    );
  };

  Object.entries(schemaMap).forEach(([table, columns]) => ensureTable(table, columns));

  db.serialize(() => {
    console.log("🔩 Ensuring indexes...");
    db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_org_hidden ON uploaded_files (org_id, hidden)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_by ON uploaded_files (created_by_user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_at ON uploaded_files (uploaded_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_parent_id ON uploaded_files (parent_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_qc_data_file_id ON qc_data (file_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sample_map_file_id ON sample_id_X_file_id (file_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_rest_data_file_id ON rest_data (file_id)`);
  });
});

// ----------------------------------------------------
// Default Seeds
// ----------------------------------------------------
db.serialize(() => {
  db.run(`INSERT OR IGNORE INTO organizations (id, name) VALUES (1, 'Main Lab')`);
  db.run(`INSERT OR IGNORE INTO organizations (id, name) VALUES (2, 'Client Lab A')`);
  db.run(`INSERT OR IGNORE INTO organizations (id, name) VALUES (3, 'Client Lab B')`);

  const seedUser = async (email, plainPassword, isAdmin, mustChange, orgId) => {
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
      if (err) return console.error("Error checking for user:", err.message);
      if (!row) {
        try {
          const hashed = await bcrypt.hash(plainPassword, 10);
          db.run(
            `INSERT INTO users (email, password, is_admin, must_change_password, org_id)
             VALUES (?, ?, ?, ?, ?)`,
            [email, hashed, isAdmin ? 1 : 0, mustChange ? 1 : 0, orgId],
            (err2) => {
              if (err2) console.error("Insert error:", err2.message);
              else console.log(`👤 Inserted user: ${email}`);
            }
          );
        } catch (e2) {
          console.error("Hash error:", e2.message);
        }
      } else {
        console.log(`User already exists: ${email}`);
      }
    });
  };

  seedUser("admin@gmail.com", "Admin1", true, false, 1);
  seedUser("client1@gmail.com", "Client1", false, false, 2);
  seedUser("client2@gmail.com", "Client2", false, false, 3);
});

module.exports = db;




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

// // ----------------------------------------------------
// // Database Connection
// // ----------------------------------------------------
// const db = new sqlite3.Database(dbPath, (err) => {
//   if (err) console.error("SQLite connection error:", err.message);
//   else console.log("Connected to SQLite database!");
// });

// // Global safeguard against duplicate/lock errors
// db.on("error", (err) => {
//   if (err?.message?.includes("duplicate column name: parent_id")) {
//     console.log("parent_id already exists (global ignore).");
//   } else {
//     console.error(" SQLite emitted an error:", err.message);
//   }
// });

// // Safety + performance tuning
// db.run("PRAGMA foreign_keys = ON");
// db.run("PRAGMA journal_mode = WAL");

// // ----------------------------------------------------
// // Schema Creation
// // ----------------------------------------------------
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
//       file_path TEXT NOT NULL,
//       pdfname TEXT NOT NULL,
//       pdf_path TEXT NOT NULL,
//       uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       type INTEGER NOT NULL,
//       hidden INTEGER DEFAULT 0,
//       org_id INTEGER NOT NULL,
//       created_by_user_id INTEGER,
//       FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
//       FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
//     )
//   `);

//   // ---------------------------
//   // Table: sample_data
//   // ---------------------------
//   const colsDef = completeHeaders.map((col) => `"${col}" TEXT`).join(", ");
//   db.run(`
//     CREATE TABLE IF NOT EXISTS sample_data (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       file_id INTEGER NOT NULL,
//       ${colsDef},
//       FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
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
//       element TEXT,
//       fullElementName TEXT,
//       valueAvg REAL,
//       correctedValueAvg REAL,
//       rsd REAL,
//       errorPercentage REAL,
//       isWithinTolerance BOOLEAN,
//       isNotWithinTolerance BOOLEAN,
//       errorFactor REAL,
//       rowType TEXT DEFAULT 'raw',
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
//       file_id INTEGER NOT NULL,
//       ${colsDef3},
//       FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
//     )
//   `);
//   db.run(`CREATE INDEX IF NOT EXISTS idx_rest_data_file_id ON rest_data(file_id)`);

//   // ---------------------------
//   // Table: sjs
//   // ---------------------------
//   const allCols = [...OTstdcleaned, ...OMstdcleaned];
//   const columnDefs = allCols.map((col) => `"${col}" TEXT`).join(", ");

//   db.run(
//     `CREATE TABLE IF NOT EXISTS sjs (
//       id INTEGER PRIMARY KEY,
//       file_id INTEGER NOT NULL,
//       label TEXT NOT NULL,
//       ${columnDefs},
//       error_pct REAL,
//       tolerance_pct REAL,
//       rsd_pct REAL,
//       status TEXT,
//       FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
//     )`,
//     (err) => {
//       if (err) console.error("Error creating sjs table:", err.message);
//       else console.log("sjs table created.");
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
//       org_id INTEGER NOT NULL,
//       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
//     )
//   `);
// });

// // ----------------------------------------------------
// // 💪 Crash-Proof parent_id Column Patch (final safe version)
// // ----------------------------------------------------
// db.serialize(() => {
//   try {
//     db.all("PRAGMA table_info(uploaded_files)", (err, columns) => {
//       if (err) {
//         console.error(" Error reading uploaded_files schema:", err.message);
//         return;
//       }

//       const hasParentId =
//         Array.isArray(columns) && columns.some((c) => c.name === "parent_id");

//       if (!hasParentId) {
//         console.log("🛠 Adding parent_id column...");
//         db.exec(
//           "ALTER TABLE uploaded_files ADD COLUMN parent_id INTEGER DEFAULT NULL;",
//           (alterErr) => {
//             if (alterErr && !alterErr.message.includes("duplicate column name")) {
//               console.error(" ALTER TABLE error:", alterErr.message);
//             } else if (alterErr) {
//               console.log("parent_id already exists (safe).");
//             } else {
//               console.log("parent_id column added successfully!");
//             }

//             // Final verification
//             db.all("PRAGMA table_info(uploaded_files)", (checkErr, checkCols) => {
//               if (checkErr) {
//                 console.error(" Recheck failed:", checkErr.message);
//                 return;
//               }
//               if (checkCols.some((c) => c.name === "parent_id")) {
//                 console.log("parent_id column verified and available.");
//               } else {
//                 console.warn(" parent_id column still missing — manual check advised.");
//               }
//             });
//           }
//         );
//       } else {
//         console.log("parent_id column already exists.");
//       }
//     });
//   } catch (e) {
//     console.error(" parent_id migration fatal error:", e.message);
//   }
// });

// // ----------------------------------------------------
// // Helpful Indexes
// // ----------------------------------------------------
// db.serialize(() => {
//   db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_org_hidden ON uploaded_files (org_id, hidden)`);
//   db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_by ON uploaded_files (created_by_user_id)`);
//   db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_at ON uploaded_files (uploaded_at)`);
//   db.run(`CREATE INDEX IF NOT EXISTS idx_qc_data_file_id ON qc_data (file_id)`);
//   db.run(`CREATE INDEX IF NOT EXISTS idx_sample_map_file_id ON sample_id_X_file_id (file_id)`);
//   db.run(`CREATE INDEX IF NOT EXISTS idx_uploaded_files_parent_id ON uploaded_files (parent_id)`);
// });

// // ----------------------------------------------------
// // Default Seeds
// // ----------------------------------------------------
// db.serialize(() => {
//   db.run(`INSERT OR IGNORE INTO organizations (id, name) VALUES (1, 'Main Lab')`);
//   db.run(`INSERT OR IGNORE INTO organizations (id, name) VALUES (2, 'Client Lab A')`);
//   db.run(`INSERT OR IGNORE INTO organizations (id, name) VALUES (3, 'Client Lab B')`);

//   const seedUser = async (email, plainPassword, isAdmin, mustChange, orgId) => {
//     db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
//       if (err) return console.error("Error checking for user:", err.message);
//       if (!row) {
//         try {
//           const hashed = await bcrypt.hash(plainPassword, 10);
//           db.run(
//             `INSERT INTO users (email, password, is_admin, must_change_password, org_id)
//              VALUES (?, ?, ?, ?, ?)`,
//             [email, hashed, isAdmin ? 1 : 0, mustChange ? 1 : 0, orgId],
//             (err2) => {
//               if (err2) console.error("Insert error:", err2.message);
//               else console.log(`Inserted user: ${email}`);
//             }
//           );
//         } catch (e2) {
//           console.error("Hash error:", e2.message);
//         }
//       } else {
//         console.log(`User already exists: ${email}`);
//       }
//     });
//   };

//   seedUser("admin@gmail.com", "Admin1", true, false, 1);
//   seedUser("client1@gmail.com", "Client1", false, false, 2);
//   seedUser("client2@gmail.com", "Client2", false, false, 3);
// });

// module.exports = db;
