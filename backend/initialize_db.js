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
  if (err) console.error(" SQLite connection error:", err.message);
  else console.log("Connected to SQLite database!");
});

// Global safeguard for runtime DB errors
db.on("error", (err) => {
  if (err?.message?.includes("duplicate column name: parent_id")) {
    console.log("parent_id already exists (ignored).");
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
  //  Organizations
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  //  Uploaded Files
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
      season TEXT DEFAULT 'pre_basalt',
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  //  Sample Data
  const colsDef = completeHeaders.map((col) => `"${col}" TEXT`).join(", ");
  db.run(`
    CREATE TABLE IF NOT EXISTS sample_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      ${colsDef},
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )
  `);

  //  Mapping Table
  db.run(`
    CREATE TABLE IF NOT EXISTS sample_id_X_file_id (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      FOREIGN KEY (sample_id) REFERENCES sample_data(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )
  `);

  //  QC Data
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

  //  Rest Data
  const colsDef3 = rest_dataHeaders.map((col) => `"${col}" TEXT`).join(", ");
  db.run(`
    CREATE TABLE IF NOT EXISTS rest_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      ${colsDef3},
      FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
    )
  `);


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
    if (err) return console.error(' Error creating sjs table:', err);
    console.log('sjs table created.');

    // Prepare insert query with 81 placeholders (1 id + 1 label + 61 + 18 = 81)
    const placeholders = Array(allCols.length + 2).fill('?').join(', ');
    const insertSQL = `INSERT OR IGNORE INTO sjs VALUES (${placeholders})`;


    // Build the rows
    const row1 = [1, 'SJS-Std', ...Tval, ...Mval];
    const row2 = [2, 'Error', ...Terr, ...Merr];
    console.log('allCols length:', allCols.length);
    console.log('row1 length:', row1.length, 'row2 length:', row2.length);
    console.log('placeholders count:', allCols.length + 2);
    // Insert both rows
    db.run(insertSQL, row1, (err) => {
      if (err) {
        console.error(' Error inserting Row 1 (SJS-Std):', err.message);
      } else if (this.changes > 0) {
        console.log('Row 1 (SJS-Std) inserted');
      }
    });

    db.run(insertSQL, row2, (err) => {
      if (err) {
        console.error(' Error inserting Row 2 (Error):', err.message);
      } else if (this.changes > 0) {
        console.log('Row 2 (Error) inserted');
      }
    });
  });
  
  // ---------------------------
  // Table: sjs_mcb  (BHVO-2 Reference)
  // ---------------------------

  const { OTstd_MCB, Tval_MCB, Terr_MCB } = require("./Oheaders");

  const columnDefsMCB = OTstd_MCB.map(col => `"${col}" TEXT`).join(', ');

  db.run(`
    CREATE TABLE IF NOT EXISTS sjs_mcb (
      id INTEGER PRIMARY KEY,
      label TEXT NOT NULL,
      ${columnDefsMCB}
    );
  `, (err) => {
    if (err) return console.error(" Error creating sjs_mcb table:", err);
    console.log("sjs_mcb table created.");

    const placeholdersMCB = Array(OTstd_MCB.length + 2).fill("?").join(", ");
    const insertSQL_MCB = `INSERT OR IGNORE INTO sjs_mcb VALUES (${placeholdersMCB})`;

    const row1_MCB = [1, "BHVO-2 STD", ...Tval_MCB];
    const row2_MCB = [2, "Error", ...Terr_MCB];

    db.run(insertSQL_MCB, row1_MCB, function (err2) {
      if (err2) console.error(" Error inserting BHVO-2 STD:", err2.message);
      else if (this.changes > 0) console.log("Inserted BHVO-2 STD row");
    });

    db.run(insertSQL_MCB, row2_MCB, function (err3) {
      if (err3) console.error(" Error inserting BHVO-2 Error row:", err3.message);
      else if (this.changes > 0) console.log("Inserted BHVO-2 Error row");
    });
  });
 
  //  Users
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
// UNIVERSAL AUTO-MIGRATOR 
// ----------------------------------------------------
db.serialize(() => {
  console.log("🔧 Running universal auto-migration (tables + columns)…");

  const schemaMap = {
    organizations: {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      name: "TEXT UNIQUE NOT NULL",
      active: "INTEGER DEFAULT 1",
      created_at: "DATETIME"
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
      parent_id: "INTEGER DEFAULT NULL",
      season: "TEXT DEFAULT 'pre_basalt'"
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

      label: "TEXT",


    }
  };

  const ensureTable = (table, columns) => {
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [table],
      (err, row) => {
        if (err) {
          console.error(` Error checking table ${table}:`, err.message);
          return;
        }

        if (!row) {
          const colsSQL = Object.entries(columns)
            .map(([name, type]) => `${name} ${type}`)
            .join(", ");
          db.run(`CREATE TABLE IF NOT EXISTS ${table} (${colsSQL})`, e2 => {
            if (e2) console.error(` Failed to create ${table}:`, e2.message);
            else console.log(`🆕 Created new table: ${table}`);
          });
          return;
        }

        db.all(`PRAGMA table_info(${table})`, (err2, existingCols) => {
          if (err2) {
            console.error(` Failed to inspect ${table}:`, err2.message);
            return;
          }
          const existingNames = existingCols.map(c => c.name);
          Object.entries(columns).forEach(([col, def]) => {
            if (!existingNames.includes(col)) {
              const alterSQL = `ALTER TABLE ${table} ADD COLUMN ${col} ${def}`;
              db.run(alterSQL, e3 => {
                if (e3 && !e3.message.includes("duplicate column name")) {
                  console.error(` ${table}: failed to add '${col}' →`, e3.message);
                } else {
                  console.log(`${table}: ensured column '${col}'`);
                }
              });
            }
          });
        });
      }
    );
  };

  Object.entries(schemaMap).forEach(([table, columns]) => ensureTable(table, columns));
  // --- One-time backfill for organizations.created_at ---
  db.all(`PRAGMA table_info(organizations)`, (err, cols) => {
    if (!err && cols.some(c => c.name === 'created_at')) {
      db.run(`
        UPDATE organizations 
        SET created_at = CURRENT_TIMESTAMP 
        WHERE created_at IS NULL
      `, (e2) => {
        if (e2) console.error(" Failed to backfill created_at:", e2.message);
        else console.log("organizations.created_at backfilled where missing.");
      });
    }
  });

  db.serialize(() => {
    console.log("Ensuring indexes...");
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
  seedUser("client3@gmail.com", "Client3", false, false, 2);
});

module.exports = db;

