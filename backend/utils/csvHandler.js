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

// -----------------------------
// 🔤 Normalize single header
// -----------------------------
function normalizeHeader(header) {
  return header.trim().replace(/^"|"$/g, '').replace(/\s+/g, ' ');
}

// -----------------------------
// 🧾 Header Parsing (Type 1)
// -----------------------------
async function getHeadersType1(filePath) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
    rl.on('line', (line) => {
      rl.close();
      resolve(
        line.split(',').map(normalizeHeader).filter(h => h !== '')
      );
    });
    rl.on('error', reject);
  });
}

// -----------------------------
// 🧾 Header Parsing (Type 2)
// -----------------------------
function getHeadersType2(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
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

  return headers;
}

// -----------------------------
// 📤 Get Headers by Type
// -----------------------------
async function getHeaders(csvType, filePath) {
  if (csvType === 1) return await getHeadersType1(filePath);
  if (csvType === 2) return getHeadersType2(filePath);
  throw new Error('Unsupported CSV type');
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
  actual.forEach((header, i) => {
    const expectedHeader = expected[i];
    if (normalizeHeader(header) !== normalizeHeader(expectedHeader)) {
      console.log(`Mismatch at index ${i}`);
      console.log(`Actual  : "${header}"`);
      console.log(`Expected: "${expectedHeader}"`);
    }
  });

  return actual.length === expected.length &&
         actual.every((h, i) =>
           normalizeHeader(h) === normalizeHeader(expected[i])
         );
}

// -----------------------------
// 📦 Parse Full Data Rows (both types)
// -----------------------------
async function parseDataRows(filePath, csvType) {
  const content = fs.readFileSync(filePath, 'utf8');
  const allRows = parse(content, { skip_empty_lines: true });

  const headers =
    csvType === 1 ? OcleanedHeaders1
    : csvType === 2 ? OcleanedHeaders2
    : (() => { throw new Error('Unsupported CSV type'); })();

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
function filterColumnsByKeys(rows, csvType) {
  const isType1 = csvType === 1;

  const nonE = isType1 ? nonE1 : nonE2;
  const conc = isType1 ? MEconc : TEconc;

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
    { name: '2 % HNO3', regex: /^2 % HNO3$/},
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
  normalizeHeader,
  filterColumnsByKeys
};
