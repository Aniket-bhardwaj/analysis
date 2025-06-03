const Oheaders1 = [
  "Rack:Tube",
  "Solution Label",
  "Timestamp",
  "Al 237.312 nm ppm",
  "Al 308.215 nm ppm",
  "Ca 315.887 nm ppm",
  "Ca 422.673 nm ppm",
  "Fe 238.204 nm ppm",
  "Fe 259.940 nm ppm",
  "K 766.491 nm ppm",
  "K 769.897 nm ppm",
  "Mg 279.553 nm ppm",
  "Mg 280.270 nm ppm",
  "Mn 257.610 nm ppm",
  "Mn 293.931 nm ppm",
  "Na 588.995 nm ppm",
  "Na 589.592 nm ppm",
  "P 213.618 nm ppm",
  "P 214.914 nm ppm",
  "Ti 334.941 nm ppm",
  "Ti 336.122 nm ppm"
];


const Oheaders2 = [
  "Sample",
  "Rjct",
  "Data File",
  "Acq. Date-Time",
  "Type",
  "Level",
  "Solution Label",
  "Total Dil.",
  "Vial Number",
  "7 Li [ No Gas ]",
  "7 Li [ He ]",
  "9 Be [ No Gas ]",
  "9 Be [ He ]",
  "45 Sc [ No Gas ]",
  "45 Sc [ He ]",
  "51 V [ No Gas ]",
  "51 V [ He ]",
  "52 Cr [ No Gas ]",
  "52 Cr [ He ]",
  "59 Co [ No Gas ]",
  "59 Co [ He ]",
  "60 Ni [ No Gas ]",
  "60 Ni [ He ]",
  "63 Cu [ No Gas ]",
  "63 Cu [ He ]",
  "66 Zn [ No Gas ]",
  "66 Zn [ He ]",
  "71 Ga [ No Gas ]",
  "71 Ga [ He ]",
  "85 Rb [ No Gas ]",
  "85 Rb [ He ]",
  "88 Sr [ No Gas ]",
  "88 Sr [ He ]",
  "89 Y [ No Gas ]",
  "89 Y [ He ]",
  "90 Zr [ No Gas ]",
  "90 Zr [ He ]",
  "95 Mo [ No Gas ]",
  "95 Mo [ He ]",
  "107 Ag [ No Gas ]",
  "107 Ag [ He ]",
  "111 Cd [ No Gas ]",
  "111 Cd [ He ]",
  "118 Sn [ No Gas ]",
  "118 Sn [ He ]",
  "121 Sb [ No Gas ]",
  "121 Sb [ He ]",
  "133 Cs [ No Gas ]",
  "133 Cs [ He ]",
  "137 Ba [ No Gas ]",
  "137 Ba [ He ]",
  "138 Ba [ He ]",
  "139 La [ No Gas ]",
  "139 La [ He ]",
  "140 Ce [ No Gas ]",
  "140 Ce [ He ]",
  "141 Pr [ No Gas ]",
  "141 Pr [ He ]",
  "146 Nd [ No Gas ]",
  "146 Nd [ He ]",
  "147 Sm [ No Gas ]",
  "147 Sm [ He ]",
  "153 Eu [ No Gas ]",
  "153 Eu [ He ]",
  "157 Gd [ No Gas ]",
  "157 Gd [ He ]",
  "159 Tb [ No Gas ]",
  "159 Tb [ He ]",
  "163 Dy [ No Gas ]",
  "163 Dy [ He ]",
  "165 Ho [ No Gas ]",
  "165 Ho [ He ]",
  "166 Er [ No Gas ]",
  "166 Er [ He ]",
  "169 Tm [ No Gas ]",
  "169 Tm [ He ]",
  "172 Yb [ No Gas ]",
  "172 Yb [ He ]",
  "175 Lu [ No Gas ]",
  "175 Lu [ He ]",
  "178 Hf [ No Gas ]",
  "178 Hf [ He ]",
  "181 Ta [ No Gas ]",
  "181 Ta [ He ]",
  "205 Tl [ No Gas ]",
  "205 Tl [ He ]",
  "206 [Pb] [ He ]",
  "207 [Pb] [ He ]",
  "208 Pb [ No Gas ]",
  "208 Pb [ He ]",
  "209 Bi [ No Gas ]",
  "209 Bi [ He ]",
  "232 Th [ No Gas ]",
  "232 Th [ He ]",
  "238 U [ No Gas ]",
  "238 U [ He ]",
  "103 Rh ( ISTD ) [ No Gas ]",
  "103 Rh ( ISTD ) [ He ]"
];

const complete = [
  "Sample",
  "Rjct",
  "Data File",
  "Acq. Date-Time",
  "Type",
  "Level",
  "Total Dil.",
  "Vial Number",
  "Rack:Tube",
  "Solution Label",
  "Timestamp",
  "Al 237.312 nm ppm",
  "Al 308.215 nm ppm",
  "Ca 315.887 nm ppm",
  "Ca 422.673 nm ppm",
  "Fe 238.204 nm ppm",
  "Fe 259.940 nm ppm",
  "K 766.491 nm ppm",
  "K 769.897 nm ppm",
  "Mg 279.553 nm ppm",
  "Mg 280.270 nm ppm",
  "Mn 257.610 nm ppm",
  "Mn 293.931 nm ppm",
  "Na 588.995 nm ppm",
  "Na 589.592 nm ppm",
  "P 213.618 nm ppm",
  "P 214.914 nm ppm",
  "Ti 334.941 nm ppm",
  "Ti 336.122 nm ppm",
  "7 Li [ No Gas ]",
  "7 Li [ He ]",
  "9 Be [ No Gas ]",
  "9 Be [ He ]",
  "45 Sc [ No Gas ]",
  "45 Sc [ He ]",
  "51 V [ No Gas ]",
  "51 V [ He ]",
  "52 Cr [ No Gas ]",
  "52 Cr [ He ]",
  "59 Co [ No Gas ]",
  "59 Co [ He ]",
  "60 Ni [ No Gas ]",
  "60 Ni [ He ]",
  "63 Cu [ No Gas ]",
  "63 Cu [ He ]",
  "66 Zn [ No Gas ]",
  "66 Zn [ He ]",
  "71 Ga [ No Gas ]",
  "71 Ga [ He ]",
  "85 Rb [ No Gas ]",
  "85 Rb [ He ]",
  "88 Sr [ No Gas ]",
  "88 Sr [ He ]",
  "89 Y [ No Gas ]",
  "89 Y [ He ]",
  "90 Zr [ No Gas ]",
  "90 Zr [ He ]",
  "95 Mo [ No Gas ]",
  "95 Mo [ He ]",
  "107 Ag [ No Gas ]",
  "107 Ag [ He ]",
  "111 Cd [ No Gas ]",
  "111 Cd [ He ]",
  "118 Sn [ No Gas ]",
  "118 Sn [ He ]",
  "121 Sb [ No Gas ]",
  "121 Sb [ He ]",
  "133 Cs [ No Gas ]",
  "133 Cs [ He ]",
  "137 Ba [ No Gas ]",
  "137 Ba [ He ]",
  "138 Ba [ He ]",
  "139 La [ No Gas ]",
  "139 La [ He ]",
  "140 Ce [ No Gas ]",
  "140 Ce [ He ]",
  "141 Pr [ No Gas ]",
  "141 Pr [ He ]",
  "146 Nd [ No Gas ]",
  "146 Nd [ He ]",
  "147 Sm [ No Gas ]",
  "147 Sm [ He ]",
  "153 Eu [ No Gas ]",
  "153 Eu [ He ]",
  "157 Gd [ No Gas ]",
  "157 Gd [ He ]",
  "159 Tb [ No Gas ]",
  "159 Tb [ He ]",
  "163 Dy [ No Gas ]",
  "163 Dy [ He ]",
  "165 Ho [ No Gas ]",
  "165 Ho [ He ]",
  "166 Er [ No Gas ]",
  "166 Er [ He ]",
  "169 Tm [ No Gas ]",
  "169 Tm [ He ]",
  "172 Yb [ No Gas ]",
  "172 Yb [ He ]",
  "175 Lu [ No Gas ]",
  "175 Lu [ He ]",
  "178 Hf [ No Gas ]",
  "178 Hf [ He ]",
  "181 Ta [ No Gas ]",
  "181 Ta [ He ]",
  "205 Tl [ No Gas ]",
  "205 Tl [ He ]",
  "206 [Pb] [ He ]",
  "207 [Pb] [ He ]",
  "208 Pb [ No Gas ]",
  "208 Pb [ He ]",
  "209 Bi [ No Gas ]",
  "209 Bi [ He ]",
  "232 Th [ No Gas ]",
  "232 Th [ He ]",
  "238 U [ No Gas ]",
  "238 U [ He ]",
  "103 Rh ( ISTD ) [ No Gas ]",
  "103 Rh ( ISTD ) [ He ]"

  

];



const compHeaders = (headers) => {
  const seen = new Set();
  const cleaned = [];

  headers.forEach((h, i) => {
    let colName = h.trim().replace(/^"|"$/g, '') || `col_${i + 1}`;

    let uniqueName = colName;
    let counter = 1;
    while (seen.has(uniqueName)) {
      uniqueName = `${colName}_${counter++}`;
    }
    seen.add(uniqueName);
    cleaned.push(uniqueName);

    // Add corrected version for element columns (with "nm ppm" suffix)
   if (uniqueName.match(/(nm\s*ppm|No\s+Gas|He)/i)) {
  const correctedCol = `${uniqueName}_Corrected`;
  seen.add(correctedCol);
  cleaned.push(correctedCol);
}

  });

  return cleaned;
};


const OcleanedHeaders1 = Oheaders1.map(h=>h.trim().replace(/^"|"$/g, ''));
const OcleanedHeaders2 = Oheaders2.map(h=>h.trim().replace(/^"|"$/g, ''));
const cleanComplete = complete.map(h=>h.trim().replace(/^"|"$/g, ''));

const completeHeaders = compHeaders(cleanComplete);

const nmPpmColumns = [];
const correctedColumns = [];

completeHeaders.forEach((col) => {
    if (col.match(/nm\s*ppm$/i) && !col.includes('_Corrected')) {
          nmPpmColumns.push(col);
    } else if (col.match(/nm\s*ppm$/i) && col.includes('_Corrected')) {
            correctedColumns.push(col);
    }
});

const errorLabels = ['QC_MES_5 ppm', 'QC_WCS_2.5 ppm', 'SJS_STD'];

module.exports = {

  OcleanedHeaders1,
  OcleanedHeaders2,
  completeHeaders,
  nmPpmColumns,
  correctedColumns,
  errorLabels
  
};






