const express = require('express');
const controller = require('../controllers/ticketController');
const validate = require('../middleware/validate');
const {
  idParamSchema,
  createTicketSchema,
  updateTicketSchema,
  updateStatusSchema,
  listTicketsQuerySchema,
} = require('../validators/ticketValidators');

const router = express.Router();
const validId = validate(idParamSchema, 'params');

// Express 5 forwards rejected promises from async handlers to the error handler.
router.get('/', validate(listTicketsQuerySchema, 'query'), controller.listTickets);
router.post('/', validate(createTicketSchema), controller.createTicket);
router.get('/:id', validId, controller.getTicket);
router.patch('/:id', validId, validate(updateTicketSchema), controller.updateTicket);
router.patch('/:id/status', validId, validate(updateStatusSchema), controller.updateTicketStatus);
router.delete('/:id', validId, controller.deleteTicket);
router.get('/:id/history', validId, controller.getStatusHistory);
router.get('/:id/activity', validId, controller.getActivity);

module.exports = router;
