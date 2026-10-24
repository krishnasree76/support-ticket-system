const AppError = require('../utils/AppError');

// Builds middleware that validates req[source] against a Zod schema.
// The parsed (trimmed, coerced, defaulted) value is stored on req.validated
// so controllers never work with raw, unvalidated input.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || null,
        message: issue.code === 'unrecognized_keys'
          ? `Unknown field(s): ${issue.keys.join(', ')}`
          : issue.message,
      }));
      return next(AppError.badRequest(details[0].message, details));
    }
    req.validated = { ...req.validated, [source]: result.data };
    return next();
  };
}

module.exports = validate;
