const express = require("express");
const router = express.Router();
const graphController = require("../controllers/graphController");

router.post("/graph-data", graphController.getGraphData);
router.post("/graph-elements", graphController.getElements); // Legacy route for compatibility
router.post("/sjs-graph", graphController.getSJSGraphData); // NEW: SJS Graph

module.exports = router;
