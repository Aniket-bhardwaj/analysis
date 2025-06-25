// =============================
// 📁 csvHandler.js
// =============================

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const readline = require('readline');
const csv = require('csv-parser');

const {
  OcleanedHeaders1,
  OcleanedHeaders2,
  nonE2,
  nonE1,
  TEconc,
  MEconc
} = require('../colHeaders');

/**
 * Remove columns containing CPS, ISTD, or C/S
 */
const filterOutCpsAndIstd = (columns) =>
  columns.filter(col => {
    const upper = col.toUpperCase();
    return !upper.includes('CPS') && !upper.includes('ISTD') && !upper.includes('C/S');
  });


// -----------------------------
// 🔤 Normalize headers
// -----------------------------
const normalizeHeaders = (headers) =>
  headers.map(h => h.trim().replace(/^"|"$/g, '').replace(/\s+/g, ' '));

// -----------------------------
// 🧾 Header Parsing (Type 1)
// -----------------------------
async function getHeadersType1(filePath) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
    rl.on('line', (line) => {
      rl.close();
      resolve(
        line.split(',').filter(h => h !== '') // no normalization here
      );
    });
    rl.on('error', reject);
  });
}


// -----------------------------
// 🧾 Header Parsing (Type 2)
// -----------------------------

function getHeadersType2(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) return reject(err);

      try {
        const [row1, row2] = parse(content, { to_line: 2 });
        const headers = [];
        let i = 0;

        while (i < row1.length) {
          const val1 = (row1[i] || '').trim();
          if (val1.includes('[')) {
            const base = val1;
            const sub1 = (row2[i] || '').trim();
            const sub2 = (row2[i + 1] || '').trim();
            const sub3 = (row2[i + 2] || '').trim();

            headers.push(`${base} ${sub1}`.trim());
            headers.push(`${base} ${sub2}`.trim());
            headers.push(`${base} ${sub3}`.trim());

            i += 3;
          } else {
            headers.push(val1);
            i += 1;
          }
        }

        resolve(headers);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}

// -----------------------------
// 📤 Get Headers by Type
// -----------------------------
async function getHeaders(csvType, filePath) {
  let headers;

  if (csvType === 1) {
    headers = await getHeadersType1(filePath);
  } else if (csvType === 2) {
    headers = await getHeadersType2(filePath);
  } else {
    throw new Error('Unsupported CSV type');
  }

  return normalizeHeaders(headers);
}

// -----------------------------
// 🔍 Detect CSV Type
// -----------------------------
function checkCsvType(firstLine) {
  if (firstLine[0] === 'Rack:Tube') return 1;
  if (firstLine[0] === 'Sample') return 2;
  return 0;
}

// -----------------------------
// ✅ Validate Header Order/Match
// -----------------------------
function validateHeaders(actual, csvType) {
  const expected = csvType === 1 ? OcleanedHeaders1 : OcleanedHeaders2;

  console.log('[Header Debug]');
  
  for (const header of actual) {
    const found = expected.some(eh => eh === header);
    if (!found) {
      console.error(`Error: Header "${header}" not found in expected headers.`);
      return false;
    }
  }

  return true;
}

// -----------------------------
// 📦 Parse Full Data Rows (both types)
// -----------------------------
async function parseDataRows(filePath, headers) {
  const content = fs.readFileSync(filePath, 'utf8');
  const allRows = parse(content, { skip_empty_lines: true });

  const dataRows = allRows.slice(2); // Always skip header + subheader
  const parsed = [];

  for (const row of dataRows) {
    if (row.length === 0) continue;

    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] !== undefined ? row[i].trim() : '';
    }

    parsed.push(obj);
  }

  return parsed;
}

// -----------------------------
// 🧹 Filter Columns into 2 Maps
// -----------------------------
function filterColumnsByKeys(rows, csvType,headers) {
  const isType1 = csvType === 1;

  const nonE = isType1 ? nonE1 : nonE2;
  const conc = filterOutCpsAndIstd(headers);

  return rows.map((row) => {
    const filtered1 = {};
    const filtered2 = {};

    for (const [key, value] of Object.entries(row)) {
      if (nonE.includes(key)) {
        filtered1[key] = value;
        filtered2[key] = value;
      } else if (conc.includes(key)) {
        filtered1[key] = value;
      } else {
        filtered2[key] = value;
      }
    }

    return { filtered1, filtered2 };
  });
}

// -----------------------------
// 🧪 Separate Samples from QC
// -----------------------------
function splitSamplesAndQc(rows) {
  const samples = [], qc = [];
  for (const row of rows) {
    const label = row['Solution Label'];
    if (label.startsWith('MCS')) samples.push(row);
    else qc.push(row);
  }
  return { samples, qc };
}

// -----------------------------
// ✅ QC Label Validation
// -----------------------------
function validateQcLabels(qc) {
  const required = [
    { name: 'Blank', regex: /^Blank$/ },
    { name: 'Standard', regex: /^Standard/i },
    { name: 'BLK', regex: /^BLK/i },
    { name: 'QC MES', regex: /^QC MES/i },
    { name: 'SJS-Std', regex: /^SJS-Std$/ },
    { name: 'Wash', regex: /^Wash$/ },
  ];

  const found = Array(required.length).fill(false);
  const invalid = [];

  for (const row of qc) {
    const label = row['Solution Label']?.trim();
    if (!label) continue;
    let match = false;
    for (let i = 0; i < required.length; i++) {
      if (required[i].regex.test(label)) {
        found[i] = true;
        match = true;
        break;
      }
    }
    if (!match) invalid.push(label);
  }

  const missing = required
    .filter((_, i) => !found[i])
    .map(p => p.name);

  if (missing.length || invalid.length) {
    throw new Error(`Missing: ${missing.join(', ')}\nInvalid: ${invalid.join(', ')}`);
  }

  return true;
}

// -----------------------------
// 📤 Exports
// -----------------------------
module.exports = {
  getHeaders,
  checkCsvType,
  validateHeaders,
  parseDataRows,
  splitSamplesAndQc,
  validateQcLabels,
  normalizeHeaders,
  filterColumnsByKeys,
  filterOutCpsAndIstd
};