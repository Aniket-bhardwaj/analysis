const { ZodError } = require('zod');

function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.validated = req.validated || {};
      req.validated.body = schema.parse(req.body);
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: e.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
        });
      }
      next(e);
    }
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.validated = req.validated || {};
      req.validated.query = schema.parse(req.query);
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: e.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
        });
      }
      next(e);
    }
  };
}

module.exports = { validateBody, validateQuery };
