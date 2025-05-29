const Oheaders = [
  "Rack:Tube", "Solution Label", "Timestamp",
  "Al 237.312 nm ppm", "Al 308.215 nm ppm", "Ba 233.527 nm ppm",
  "Ca 315.887 nm ppm", "Ca 422.673 nm ppm", "Cr 205.560 nm ppm",
  "Cr 267.716 nm ppm", "Cu 324.754 nm ppm", "Fe 238.204 nm ppm",
  "Fe 259.940 nm ppm", "K 766.491 nm ppm", "K 769.897 nm ppm",
  "Mg 279.553 nm ppm", "Mg 280.270 nm ppm", "Mn 257.610 nm ppm",
  "Mn 293.931 nm ppm", "Na 588.995 nm ppm", "Na 589.592 nm ppm",
  "Ni 216.555 nm ppm", "Ni 221.648 nm ppm", "P 213.618 nm ppm",
  "P 214.914 nm ppm", "Sr 421.552 nm ppm", "Sr 460.733 nm ppm",
  "Ti 334.941 nm ppm", "Ti 336.122 nm ppm", "V 326.769 nm ppm",
  "Zn 202.548 nm ppm", "Zn 213.857 nm ppm"
];

const compHeaders = (headers) => {
  const seen = new Set();
  const cleaned = [];

  headers.forEach((h, i) => {
    let colName = h.trim() || `col_${i + 1}`;

    let uniqueName = colName;
    let counter = 1;
    while (seen.has(uniqueName)) {
      uniqueName = `${colName}_${counter++}`;
    }
    seen.add(uniqueName);
    cleaned.push(uniqueName);

    // Add corrected version for element columns (with "nm ppm" suffix)
    if (uniqueName.match(/nm\s*ppm$/i)) {
      const correctedCol = `${uniqueName}_Corrected`;
      seen.add(correctedCol);
      cleaned.push(correctedCol);
    }
  });

  return cleaned;
};


const OcleanedHeaders = Oheaders.map(h=>h.trim().replace(/^"|"$/g, ''));

const completeHeaders = compHeaders(Oheaders);

const nmPpmColumns = [];
const correctedColumns = [];

completeHeaders.forEach((col) => {
    if (col.match(/nm\s*ppm$/i) && !col.includes('_Corrected')) {
          nmPpmColumns.push(col);
    } else if (col.includes('_Corrected')) {
            correctedColumns.push(col);
    }
});

const errorLabels = ['QC_MES_5 ppm', 'QC_WCS_2.5 ppm', 'SJS_STD'];

module.exports = {
  Oheaders,
  OcleanedHeaders,
  completeHeaders,
  nmPpmColumns,
  correctedColumns,
  errorLabels
  
};






