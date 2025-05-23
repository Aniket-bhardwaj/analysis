const db = require('../initialize_db');

db.run("PRAGMA foreign_keys = ON");

const tableName = 'data';

async function createTable(columns) {
  const colsDef = columns.map(col => `"${col}" TEXT`).join(', ');
  const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER,
    ${colsDef},
    FOREIGN KEY (file_id) REFERENCES uploaded_files(id)
  )`;

  return new Promise((resolve, reject) => {
    db.run(sql, (err) => (err ? reject(err) : resolve()));
  });
}

async function getExistingColumns() {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) return reject(err);
      const colNames = rows.map(r => r.name);
      resolve(colNames);
    });
  });
}

async function addMissingColumns(columns) {
  const existingCols = await getExistingColumns();
  const missingCols = columns.filter(col => !existingCols.includes(col));
  for (const col of missingCols) {
    const sql = `ALTER TABLE ${tableName} ADD COLUMN "${col}" TEXT`;
    await new Promise((resolve, reject) => {
      db.run(sql, (err) => (err ? reject(err) : resolve()));
    });
  }
}

async function ensureTableWithColumns(columns) {
  if (!Array.isArray(columns)) {
    throw new Error('ensureTableWithColumns expects an array of columns');
  }

  await createTable(columns);
  await addMissingColumns(columns);
}

async function insertRows(rows, headers, fileId) {
  if (!rows || rows.length === 0) return;

  const insertColumns = ['file_id', ...headers];
  const placeholders = insertColumns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${tableName} (${insertColumns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

  return new Promise((resolve, reject) => {
    const stmt = db.prepare(sql, (err) => {
      if (err) return reject(err);

      try {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');

          for (const row of rows) {
            const values = [fileId];
            for (const col of headers) {
              values.push(row[col] !== undefined ? row[col] : null);
            }

            stmt.run(values, (err) => {
              if (err) {
                console.error('Insert error:', err);
                // Don't reject here to avoid transaction issues
              }
            });
          }

          db.run('COMMIT', (err) => {
            if (err) {
              console.error('Commit error:', err);
              reject(err);
              return;
            }

            stmt.finalize((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });
      } catch (e) {
        console.error('Transaction error:', e);
        db.run('ROLLBACK');
        reject(e);
      }
    });
  });
}

// Optional helper function to get all data by file_id
async function getDataByFileId(fileId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM ${tableName} WHERE file_id = ? ORDER BY id`;
    db.all(sql, [fileId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}
async function tableExists() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='data'`, (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });
}


const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function getMinMaxTimestamp(callback) {
  const dbPath = path.resolve(__dirname, '../database.sqlite');
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      callback(err);
      return;
    }

    const query = `SELECT MIN("Timestamp") AS minTimestamp, MAX("Timestamp") AS maxTimestamp FROM data`;

    db.get(query, (err, row) => {
      db.close();
      if (err) {
        callback(err);
      } else {
        callback(null, row);
      }
    });
  });
}


module.exports = {
  ensureTableWithColumns,
  insertRows,
  getDataByFileId,
  tableExists,
  getMinMaxTimestamp
};