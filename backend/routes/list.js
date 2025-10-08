const express = require("express");
const {
  listFiles,
} = require("../controllers/listController");
const router = express.Router();

router.post("/uploaded-files", listFiles);

module.exports = router;
