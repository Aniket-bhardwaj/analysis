const express = require('express');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');

const router = express.Router();

router.use(cookieParser());

// Only enforce CSRF on this endpoint to mint a token
router.get('/csrf', csurf({ cookie: true }), (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ csrfToken: req.csrfToken() });
});

module.exports = router;
