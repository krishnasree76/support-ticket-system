const assigneeService = require('../services/assigneeService');

async function listAssignees(req, res) {
  const assignees = await assigneeService.listAssignees();
  res.json({ data: assignees });
}

module.exports = { listAssignees };
