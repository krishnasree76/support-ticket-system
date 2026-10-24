const { z } = require('zod');

const isValidCalendarDate = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

// YYYY-MM-DD that is also a real calendar date (rejects 2026-02-30).
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must use the YYYY-MM-DD format')
  .refine(isValidCalendarDate, 'Date is not a valid calendar date');

const isValidTimeZone = (tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const emptyToUndefined = (value) => (value === '' ? undefined : value);

const analyticsQuerySchema = z
  .object({
    startDate: z.preprocess(emptyToUndefined, dateString.optional()),
    endDate: z.preprocess(emptyToUndefined, dateString.optional()),
    // IANA time zone used to interpret the calendar dates (e.g. Asia/Kolkata).
    timezone: z.preprocess(
      emptyToUndefined,
      z.string().max(64).refine(isValidTimeZone, 'timezone must be a valid IANA time zone').default('UTC')
    ),
  })
  // YYYY-MM-DD strings compare correctly as plain strings.
  .refine((q) => !q.startDate || !q.endDate || q.startDate <= q.endDate, {
    message: 'startDate must be on or before endDate',
    path: ['startDate'],
  });

module.exports = { analyticsQuerySchema };
