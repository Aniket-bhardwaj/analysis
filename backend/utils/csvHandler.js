const fs = require('fs');
const csv = require('csv-parser');
const readline = require('readline');
const { OcleanedHeaders1, OcleanedHeaders2 } = require('../colHeaders');

// 1. Normalize CSV headers
function normalizeHeader(header) {
  return header.trim().replace(/^"|"$/g, '').replace(/\s+/g, ' ');
}

async function parseHeaders(filepath) {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = fs.createReadStream(filepath);
      const rl = readline.createInterface({ input: stream });

      let rawHeaders = null;
      for await (const line of rl) {
        rawHeaders = line.split(',').map(normalizeHeader).filter(h => h !== '');
        break; // only first line headers
      }
      rl.close();

      if (!rawHeaders || rawHeaders.length === 0) {
        return reject(new Error('CSV file has no headers'));
      }

      resolve(rawHeaders);
    } catch (err) {
      reject(err);
    }
  });
}

// 2. Detect CSV type via column count and first column check
function checkColumnCount(headers) {
  if (headers.length === OcleanedHeaders1.length && headers[0] === 'Rack:Tube') {
    return 1;
  } else if (headers.length === OcleanedHeaders2.length && headers[0] === 'Sample') {
    return 2;
  }
  return 0; // unsupported
}

// 3. Validate header names strictly match expected
function validateHeaderNames(headers, csvType) {
  const expected = csvType === 1 ? OcleanedHeaders1 : OcleanedHeaders2;
  if (headers.length !== expected.length) {
    return false;
  }
  for (let i = 0; i < headers.length; i++) {
    if (normalizeHeader(headers[i]) !== normalizeHeader(expected[i])) {
      return false;
    }
  }
  return true;
}

// 4. Parse data rows (skip 2nd row if needed, map rows with normalized keys)
async function parseDataRows(filepath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let isSecondRowSkipped = false;

    fs.createReadStream(filepath)
      .pipe(csv())
      .on('data', (data) => {
        if (!isSecondRowSkipped) {
          // skip the second row (index 1)
          isSecondRowSkipped = true;
          return;
        }

        const cleanedRow = {};
        Object.entries(data).forEach(([key, val]) => {
          const cleanKey = normalizeHeader(key);
          if (cleanKey !== '') cleanedRow[cleanKey] = val;
        });

        rows.push(cleanedRow);
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// 5. Split rows into samples and QC based on 'Solution Label'
function splitSamplesAndQC(rows) {
  const samples = [];
  const qc = [];

  for (const row of rows) {
    const label = (row['Solution Label'] || '').toUpperCase().trim();
    if (label.startsWith('MCS')) {
      samples.push(row);
    } else {
      qc.push(row);
    }
  }

  return { samples, qc };
}

module.exports = {
  parseHeaders,
  checkColumnCount,
  validateHeaderNames,
  parseDataRows,
  splitSamplesAndQC,
};
