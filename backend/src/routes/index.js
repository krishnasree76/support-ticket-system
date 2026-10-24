const express = require('express');
const ticketRoutes = require('./ticketRoutes');
const { listAssignees } = require('../controllers/assigneeController');
const { getAnalytics } = require('../controllers/analyticsController');
const { getMeta, getHealth } = require('../controllers/metaController');
const validate = require('../middleware/validate');
const { analyticsQuerySchema } = require('../validators/analyticsValidators');

const router = express.Router();

router.get('/health', getHealth);
router.get('/meta', getMeta);
router.get('/assignees', listAssignees);
router.get('/analytics', validate(analyticsQuerySchema, 'query'), getAnalytics);
router.use('/tickets', ticketRoutes);

module.exports = router;
