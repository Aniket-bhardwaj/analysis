const graphModel = require('../models/graphModel');
const QcGraphService = require('../services/qcGraphService');

exports.getElements = async (req, res) => {
  // accept params from body OR query
  const file_id   = req.body.file_id   || req.query.file_id;
  const start_date = req.body.start_date || req.query.start_date;
  const end_date   = req.body.end_date   || req.query.end_date;
  const { isAdmin, orgId } = req.rbac || {};

  if (!file_id && (!start_date || !end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: provide either file_id or start_date & end_date',
    });
  }

  try {
    let elements;
    if (file_id) {
      elements = await QcGraphService.getElementsbyfile(file_id, isAdmin, orgId);
    } else {
      elements = await QcGraphService.getElementsbydate(start_date, end_date, isAdmin, orgId);
    }

    return res.json({ success: true, elements });
  } catch (error) {
    console.error('Error in graphController.getElements:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------

exports.getGraphData = async (req, res) => {
  const file_id   = req.body.file_id   || req.query.file_id;
  const start_date = req.body.start_date || req.query.start_date;
  const end_date   = req.body.end_date   || req.query.end_date;
  const element    = req.body.element    || req.query.element;
  const { isAdmin, orgId } = req.rbac || {};

  if (!file_id && (!start_date || !end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: provide either file_id or start_date & end_date',
    });
  }

  try {
    let result;
    if (file_id) {
      result = await QcGraphService.fetchGraphDataByFileId(file_id, element, isAdmin, orgId);
    } else {
      result = await QcGraphService.fetchGraphDataByDateRange(start_date, end_date, element, isAdmin, orgId);
    }

    return res.json(result);
  } catch (error) {
    console.error('Error in graphController.getGraphData:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------

exports.getSJSGraphData = async (req, res) => {
  const file_id   = req.body.file_id   || req.query.file_id;
  const start_date = req.body.start_date || req.query.start_date;
  const end_date   = req.body.end_date   || req.query.end_date;
  const { isAdmin, orgId } = req.rbac || {};

  if (!file_id && (!start_date || !end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Missing file_id or date range',
    });
  }

  try {
    let result;
    if (start_date && end_date) {
      result = await graphModel.fetchSJSGraphDataByDateRange(start_date, end_date, isAdmin, orgId);
    } else if (file_id) {
      result = await graphModel.fetchSJSGraphDataByFileId(file_id, isAdmin, orgId);
    }

    return res.json(result);
  } catch (error) {
    console.error('Error in graphController.getSJSGraphData:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// const graphModel = require('../models/graphModel');
// const QcGraphService = require('../services/qcGraphService');


// exports.getElements = async (req, res) => {
//   const { file_id, start_date, end_date } = req.query;
//   const { isAdmin, orgId } = req.rbac;  

//   if (!file_id && (!start_date || !end_date)) {
//     return res.status(400).json({
//       success: false,
//       message: 'Missing required parameters: provide either file_id or start_date & end_date',
//     });
//   }

//   try {
//     let elements;

//     if (file_id) {
//       elements = await QcGraphService.getElementsbyfile(file_id, isAdmin, orgId);
//     } else {
//       elements = await QcGraphService.getElementsbydate(start_date, end_date, isAdmin, orgId);
//     }

//     res.json({ success: true, elements });
//   } catch (error) {
//     console.error('Error in graphController.getElements:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };


// exports.getGraphData = async (req, res) => {
//   const { file_id, start_date, end_date, element } = req.query;
//   const { isAdmin, orgId } = req.rbac; 

//   if (!file_id && (!start_date || !end_date)) {
//     return res.status(400).json({
//       success: false,
//       message: 'Missing required parameters: provide either file_id or start_date & end_date',
//     });
//   }

//   try {
//     let result;

//     if (file_id) {
//       result = await QcGraphService.fetchGraphDataByFileId(file_id, element, isAdmin, orgId);
//     } else {
//       result = await QcGraphService.fetchGraphDataByDateRange(start_date, end_date, element, isAdmin, orgId);
//     }

//     res.json(result);
//   } catch (error) {
//     console.error('Error in graphController.getGraphData:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };


// exports.getSJSGraphData = async (req, res) => {
//   const { file_id, start_date, end_date } = req.query;
//   const { isAdmin, orgId } = req.rbac;   // RBAC context

//   if (!file_id && (!start_date || !end_date)) {
//     return res.status(400).json({
//       success: false,
//       message: 'Missing file_id or date range',
//     });
//   }

//   try {
//     let result;

//     if (start_date && end_date) {
//       result = await graphModel.fetchSJSGraphDataByDateRange(start_date, end_date, isAdmin, orgId);
//     } else if (file_id) {
//       result = await graphModel.fetchSJSGraphDataByFileId(file_id, isAdmin, orgId);
//     }

//     res.json(result);
//   } catch (error) {
//     console.error('Error in graphController.getSJSGraphData:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
