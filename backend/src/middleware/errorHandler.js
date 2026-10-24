const AppError = require('../utils/AppError');
const config = require('../config/env');

// Catches requests that matched no route.
function notFound(req, res, next) {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// Central error handler: every error leaves the API in the same JSON shape:
//   { "error": { "code": "...", "message": "...", "details": [...] } }
// Unexpected errors are logged server-side but never expose stack traces,
// SQL, or connection details to the client.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  // Malformed JSON body sent by the client.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' },
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' },
    });
  }

  if (!config.isTest) {
    console.error('Unhandled error:', err);
  }

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.isProduction ? 'Something went wrong. Please try again later.' : err.message,
    },
  });
}

module.exports = { notFound, errorHandler };
