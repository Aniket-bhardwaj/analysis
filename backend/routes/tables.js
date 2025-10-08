console.log("tables.js route file loaded");

// routes/tableRoutes.js
const express = require("express");
const router = express.Router();
const TableController = require("../controllers/tableController");

// Get table data by file ID
router.post(
  "/table-data",
  TableController.getTableDataByFile
);
router.post(
  "/sjsTable-data",
  TableController.getSJSTableDataByFile
);
router.post(
  "/element-mini-table",
  TableController.getQcMiniTableData
);
router.post(
  "/sjs-mini-table",
  TableController.getSJSMiniTableData
);
router.post(
  '/summary', 
  TableController.getSummaryByFile
);


module.exports = router;
