// services/qcGraphService.js
const TableModel = require('../models/tableModel');
const fileModel = require('../models/fileModel');
const { TEconc, MEconc } = require('../colHeaders');
const graphModel = require('../models/graphModel');

class QcGraphService {
  // Get element names by fileId (with RBAC)
  static async getElementsbyfile(fileId, isAdmin, orgId) {
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure file belongs to this org unless admin
        const fileType = await fileModel.getTypeById(fileId, isAdmin, orgId);
        let elementNames;

        if (fileType === 1) {
          elementNames = MEconc;
        } else if (fileType === 2) {
          elementNames = TEconc;
        } else {
          return reject(new Error('Invalid or unauthorized file type'));
        }

        resolve(elementNames);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Get element names by date range (with RBAC)
  static async getElementsbydate(startDate, endDate, isAdmin, orgId) {
    return new Promise(async (resolve, reject) => {
      try {
        const types = await fileModel.getFileTypesByDateRange(startDate, endDate, isAdmin, orgId);
        let elementNames;

        if (types.length === 0) {
          resolve([]); // no files in this range
        } else if (types.length === 1 && types[0] === 1) {
          elementNames = MEconc;
        } else if (types.length === 1 && types[0] === 2) {
          elementNames = TEconc;
        } else if (types.includes(1) && types.includes(2)) {
          elementNames = [...MEconc, ...TEconc];
        }

        resolve(elementNames);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Graph data by date range
  static async fetchGraphDataByDateRange(startDate, endDate, element, isAdmin, orgId, solutionLabel = null) {
    try {
      const rows = await graphModel.queryGraphDataByDateRange(
        startDate,
        endDate,
        element,
        isAdmin,
        orgId,
        solutionLabel
      );

      if (!rows || rows.length === 0) {
        return { success: true, graphData: {} };
      }

      const points = rows
        .map(row => ({
          sample: row.timestamp,
          value: parseFloat(row[element]),
        }))
        .filter(p => !isNaN(p.value));

      const graphData = points.length > 0 ? { [element]: points } : {};
      return { success: true, graphData };
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Graph data by fileId
  static async fetchGraphDataByFileId(fileId, element, isAdmin, orgId) {
    try {
      const rows = await graphModel.queryGraphRowsByFileId(fileId, element, isAdmin, orgId);

      const points = rows
        .map(row => ({
          sample: row.timestamp,
          value: parseFloat(row[element]),
        }))
        .filter(p => !isNaN(p.value));

      const graphData = points.length > 0 ? { [element]: points } : {};
      return { success: true, graphData };
    } catch (err) {
      throw err;
    }
  }
}

module.exports = QcGraphService;

// const TableModel = require('../models/tableModel');
// const fileModel = require('../models/fileModel');
// const { TEconc, MEconc } = require('../colHeaders');
// const graphModel = require('../models/graphModel');

// class QcGraphService {
//   static async getElementsbyfile(fileId) {
//     return new Promise(async (resolve, reject) => {
//       try {
//         const fileType = await fileModel.getTypeById(fileId);
//         let elementNames;

//         if (fileType === 1) {
//           elementNames = MEconc;
//         } else if (fileType === 2) {
//           elementNames = TEconc;
//         } else {
//           return reject(new Error('Invalid file type'));
//         }

//         resolve(elementNames);
//       } catch (err) {
//         reject(err);
//       }
//     });
//   }

//   static async getElementsbydate(startDate, endDate) {
//   return new Promise(async (resolve, reject) => {
//     try {
//       const types = await fileModel.getFileTypesByDateRange(startDate, endDate);
//       let elementNames;

//       if (types.length === 0) {
//   resolve([]);  // no files in this range
// } else if (types.length === 1 && types[0] === 1) {
//   elementNames = MEconc;
// } else if (types.length === 1 && types[0] === 2) {
//   elementNames = TEconc;
// } else if (types.includes(1) && types.includes(2)) {
//   elementNames = [...MEconc, ...TEconc];
// }


//       resolve(elementNames);
//     } catch (err) {
//       reject(err);
//     }
//   });
// }

// // Process function: transforms rows into graph data
// static async fetchGraphDataByDateRange(startDate, endDate, element, solutionLabel = null) {
//   try {
//     const rows = await graphModel.queryGraphDataByDateRange(startDate, endDate, element, solutionLabel);

//     if (!rows || rows.length === 0) {
//       return { success: true, graphData: {} }; // handle empty result
//     }
//     const points = rows.map(row => ({
//   sample: row.timestamp,   // use the SQL alias directly
//   value: parseFloat(row[element])
// })).filter(p => !isNaN(p.value));


//     const graphData = points.length > 0 ? { [element]: points } : {};

//     return { success: true, graphData };
//   } catch (err) {
//     return Promise.reject(err);
//   }
// }

// static async fetchGraphDataByFileId(fileId, element) {
//   try {
    
//     const rows = await graphModel.queryGraphRowsByFileId(fileId, element);

//     const points = rows.map(row => ({
//       sample: row.timestamp,
//       value: parseFloat(row[element]),
//     })).filter(p => !isNaN(p.value));

//     const graphData = points.length > 0 ? { [element]: points } : {};

//     return { success: true, graphData };
//   } catch (err) {
//     throw err;
//   }
// }
// }

// module.exports = QcGraphService;