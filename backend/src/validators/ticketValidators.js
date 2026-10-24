const { z } = require('zod');
const { PRIORITIES, STATUSES, CATEGORIES } = require('../utils/constants');

// Route params arrive as strings; IDs must be positive integers within INT range.
const idSchema = z.coerce
  .number({ invalid_type_error: 'ID must be a number' })
  .int('ID must be a whole number')
  .positive('ID must be a positive integer')
  .max(2147483647, 'ID is too large');

// Rejects non-numeric strings like "abc" or "12abc" before coercion.
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a positive integer').pipe(idSchema),
});

const title = z
  .string({ required_error: 'Title is required', invalid_type_error: 'Title must be text' })
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be at most 200 characters');

const description = z
  .string({ required_error: 'Description is required', invalid_type_error: 'Description must be text' })
  .trim()
  .min(1, 'Description is required')
  .max(5000, 'Description must be at most 5000 characters');

const priority = z.enum(PRIORITIES, {
  errorMap: () => ({ message: `Priority must be one of: ${PRIORITIES.join(', ')}` }),
});

const status = z.enum(STATUSES, {
  errorMap: () => ({ message: `Status must be one of: ${STATUSES.join(', ')}` }),
});

const category = z.enum(CATEGORIES, {
  errorMap: () => ({ message: `Category must be one of: ${CATEGORIES.join(', ')}` }),
});

// null means "unassigned".
const assigneeId = idSchema.nullable();

// .strict() rejects unknown keys, so clients cannot set id, status,
// createdAt or updatedAt directly. Those are always server-controlled.
const createTicketSchema = z
  .object({
    title,
    description,
    priority,
    category,
    assigneeId: assigneeId.optional().default(null),
  })
  .strict();

const updateTicketSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    priority: priority.optional(),
    category: category.optional(),
    assigneeId: assigneeId.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  });

const updateStatusSchema = z.object({ status }).strict();

// Empty query-string values (e.g. ?status=) are treated as "not provided".
const emptyToUndefined = (value) => (value === '' ? undefined : value);

const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'priority', 'status'];

const listTicketsQuerySchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  status: z.preprocess(emptyToUndefined, status.optional()),
  priority: z.preprocess(emptyToUndefined, priority.optional()),
  category: z.preprocess(emptyToUndefined, category.optional()),
  assigneeId: z.preprocess(
    emptyToUndefined,
    z.union([z.literal('unassigned'), z.string().regex(/^\d+$/, 'assigneeId must be a positive integer').pipe(idSchema)]).optional()
  ),
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1, 'page must be at least 1').default(1)),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1, 'limit must be at least 1').max(100, 'limit must be at most 100').default(10)
  ),
  sortBy: z.preprocess(
    emptyToUndefined,
    z
      .enum(SORT_FIELDS, { errorMap: () => ({ message: `sortBy must be one of: ${SORT_FIELDS.join(', ')}` }) })
      .default('createdAt')
  ),
  order: z.preprocess(
    (value) => (typeof value === 'string' && value !== '' ? value.toLowerCase() : undefined),
    z.enum(['asc', 'desc'], { errorMap: () => ({ message: 'order must be asc or desc' }) }).default('desc')
  ),
});

module.exports = {
  idParamSchema,
  createTicketSchema,
  updateTicketSchema,
  updateStatusSchema,
  listTicketsQuerySchema,
};
