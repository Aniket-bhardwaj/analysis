const { Oheaders1, Oheaders2, O1n2 } = require('./Oheaders');


// ==========================
// 1. Header Utilities
// ==========================

/**
 * Normalize headers:
 * - Trim whitespace
 * - Remove surrounding quotes
 * - Collapse multiple spaces into one
 */
const normalizeHeaders = (headers) =>
  headers.map(h => h.trim().replace(/^"|"$/g, '').replace(/\s+/g, ' '));

/**
 * Remove columns containing CPS, ISTD, or C/S
 */
const filterOutCpsAndIstd = (columns) =>
  columns.filter(col => {
    const upper = col.toUpperCase();
    return !upper.includes('CPS') && !upper.includes('ISTD') && !upper.includes('C/S');
  });

/**
 * For every ppm/Conc. column, add a corresponding _Corrected column
 */
const compHeaders = (headers) => {
  const cleaned = [];
  headers.forEach((col) => {
    cleaned.push(col);
    if (col.match(/(nm\s*ppm|Conc\.)/i)) {
      cleaned.push(`${col}_Corrected`);
    }
  });
  return cleaned;
};


// ==========================
// 2. Cleaned & Complete Headers
// ==========================

// Normalized headers for raw CSV
const OcleanedHeaders1 = normalizeHeaders(Oheaders1);
const OcleanedHeaders2 = normalizeHeaders(Oheaders2);

// Headers for sample_data table (non-CPS/ISTD, with _Corrected cols)
const baseForSample = normalizeHeaders(filterOutCpsAndIstd(O1n2));
const completeHeaders = compHeaders(baseForSample);


// ==========================
// 3. Elemental Column Filters
// ==========================

/**
 * Trace Elements: Columns containing "Conc."
 */
const filterConcColumns = (columns) =>
  columns.filter(col => col.includes('Conc.'));

/**
 * Major Elements: Columns containing "nm ppm"
 */
const filterNmPpmColumns = (columns) =>
  columns.filter(col => col.includes('nm ppm'));

// Normalize and then filter for TE / ME concentrations
const normalizedO1n2 = normalizeHeaders(O1n2);
const TEconc = filterConcColumns(normalizedO1n2);
const MEconc = filterNmPpmColumns(normalizedO1n2);

// Headers for qc_data table (includes _Corrected columns)
const qcHeaders = compHeaders(normalizedO1n2);


// ==========================
// 4. Non-Element Columns for Filtering
// ==========================

/**
 * For trace file (type 2): remove anything with [brackets]
 */
const filterNonBracketColumns = (columns) =>
  normalizeHeaders(columns).filter(col => !col.includes('['));

const nonE2 = filterNonBracketColumns(OcleanedHeaders2);

/**
 * For major file (type 1): remove anything with "nm" in it
 */
const filterNonNmColumns = (columns) =>
  normalizeHeaders(columns).filter(col => !col.toLowerCase().includes('nm'));

const nonE1 = filterNonNmColumns(OcleanedHeaders1);


// ==========================
// Exports
// ==========================

module.exports = {
  OcleanedHeaders1,
  OcleanedHeaders2,
  completeHeaders,
  TEconc,
  MEconc,
  nonE2,
  nonE1,
  qcHeaders
};
