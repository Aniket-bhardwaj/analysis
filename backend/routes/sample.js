const express = require("express");
const router = express.Router();
const SampleController = require("../controllers/sampleController");

router.post(
  "/sample-table",
  SampleController.getSampleTable
);
router.post("/samples", SampleController.getAllSamples);

module.exports = router;
