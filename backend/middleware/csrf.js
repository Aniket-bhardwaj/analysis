const cookieParser = require('cookie-parser');
const csurf = require('csurf');

// Exempt only the token minting route (and later, OAuth callbacks)
const CSRF_EXCEPT = new Set([
  '/api/csrf',
  // '/api/auth/google/callback',
  // '/api/auth/azure/callback',
]);

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function conditionalCsrf() {
  const parser = cookieParser();
  const protect = csurf({ cookie: true });
  return (req, res, next) => {
    if (SAFE.has(req.method) || CSRF_EXCEPT.has(req.path)) {
      return parser(req, res, next);
    }
    return parser(req, res, (err) => (err ? next(err) : protect(req, res, next)));
  };
}

module.exports = { conditionalCsrf };
