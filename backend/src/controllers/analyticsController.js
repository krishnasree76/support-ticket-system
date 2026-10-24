const analyticsService = require('../services/analyticsService');

async function getAnalytics(req, res) {
  const analytics = await analyticsService.getAnalytics(req.validated.query);
  res.json({ data: analytics });
}

module.exports = { getAnalytics };
