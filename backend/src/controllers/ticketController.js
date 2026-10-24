const ticketService = require('../services/ticketService');

// Controllers translate HTTP <-> service calls. Inputs were already validated
// by the validate() middleware and live on req.validated.

async function listTickets(req, res) {
  const result = await ticketService.listTickets(req.validated.query);
  res.json(result);
}

async function getTicket(req, res) {
  const ticket = await ticketService.getTicket(req.validated.params.id);
  res.json({ data: ticket });
}

async function createTicket(req, res) {
  const ticket = await ticketService.createTicket(req.validated.body);
  res.status(201).json({ data: ticket });
}

async function updateTicket(req, res) {
  const ticket = await ticketService.updateTicket(req.validated.params.id, req.validated.body);
  res.json({ data: ticket });
}

async function updateTicketStatus(req, res) {
  const { ticket, changed } = await ticketService.updateTicketStatus(
    req.validated.params.id,
    req.validated.body.status
  );
  res.json({ data: ticket, meta: { changed } });
}

async function deleteTicket(req, res) {
  await ticketService.deleteTicket(req.validated.params.id);
  res.status(204).end();
}

async function getStatusHistory(req, res) {
  const history = await ticketService.getStatusHistory(req.validated.params.id);
  res.json({ data: history });
}

async function getActivity(req, res) {
  const activity = await ticketService.getActivity(req.validated.params.id);
  res.json({ data: activity });
}

module.exports = {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  updateTicketStatus,
  deleteTicket,
  getStatusHistory,
  getActivity,
};
