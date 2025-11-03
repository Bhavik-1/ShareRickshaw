const express = require('express');
const { triggerSOS, getSOSStatus, getSOSLogs, testEmailService } = require('../controllers/safetyController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all safety routes
router.use(authMiddleware);

// POST /api/safety/sos/trigger - Trigger SOS alert
router.post('/sos/trigger', triggerSOS);

// GET /api/safety/sos/status - Check SOS status and cooldown
router.get('/sos/status', getSOSStatus);

// GET /api/safety/sos/logs - Get SOS history for current user
router.get('/sos/logs', getSOSLogs);

// POST /api/safety/test-email - Test email service configuration
router.post('/test-email', testEmailService);

module.exports = router;