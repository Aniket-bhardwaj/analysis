console.log('✅ tables.js route file loaded');

// routes/tableRoutes.js
const express = require('express');
const router = express.Router();
const TableController = require('../controllers/tableController');

// Get table data by file ID
router.get('/table-data', TableController.getTableDataByFile);

router.get('/sjsTable-data',TableController.getSJSTableDataByFile);

// Get table data by date range
router.get('/table-data-by-date', TableController.getTableDataByDateRange);

// Get solution labels for table
router.get('/table-solution-labels', TableController.getSolutionLabelsForTable);

// Get detailed element statistics
router.get('/element-details', TableController.getElementDetails);

router.get('/element-mini-table', TableController.getMiniTableData);
router.get('/sjs-mini-table', TableController.getSJSMiniTableData);



module.exports = router;