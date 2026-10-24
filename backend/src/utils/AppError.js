// An error with an HTTP status and a stable machine-readable code.
// Anything thrown that is NOT an AppError is treated as an unexpected 500.
class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static invalidTransition(message, details) {
    return new AppError(400, 'INVALID_STATUS_TRANSITION', message, details);
  }
}

module.exports = AppError;
