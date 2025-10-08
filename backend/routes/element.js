const express = require("express");
const router = express.Router();
const elementController = require("../controllers/elementController");

// Element Inspector data (graph)
router.post(
  "/element-graph",
  elementController.getElementInspectorData
);

// Element dropdown options
router.post(
  "/element-options",
  elementController.getElementOptions
);

module.exports = router;
