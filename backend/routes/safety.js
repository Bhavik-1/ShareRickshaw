const express = require("express");
const {
  triggerSOS,
  getSOSStatus,
  getSOSLogs,
  testEmailService,
  captureAutoNumber,
  getAutoCaptureHistory,
} = require("../controllers/safetyController");

console.log("Safety routes: Controller loaded, functions:", {
  triggerSOS: typeof triggerSOS,
  getSOSStatus: typeof getSOSStatus,
  getSOSLogs: typeof getSOSLogs,
  testEmailService: typeof testEmailService,
  captureAutoNumber: typeof captureAutoNumber,
  getAutoCaptureHistory: typeof getAutoCaptureHistory,
});
const authMiddleware = require("../middleware/auth");

console.log("Safety routes: Loading...");

const router = express.Router();

// Test route to verify safety routes are loaded
router.get("/test", (req, res) => {
  console.log("Safety routes: Test endpoint accessed");
  res.json({ success: true, message: "Safety routes are working" });
});

// Apply authentication middleware to all safety routes
router.use(authMiddleware);

// POST /api/safety/sos/trigger - Trigger SOS alert
router.post("/sos/trigger", triggerSOS);

// GET /api/safety/sos/status - Check SOS status and cooldown
router.get("/sos/status", getSOSStatus);

// GET /api/safety/sos/logs - Get SOS history for current user
router.get("/sos/logs", getSOSLogs);

// POST /api/safety/test-email - Test email service configuration
router.post("/test-email", testEmailService);

// NEW ROUTES FOR AUTO CAPTURE
// POST /api/safety/capture-auto - Capture image, extract number plate, and save
router.post("/capture-auto", captureAutoNumber);

// GET /api/safety/capture-history - Get all previous captures for the user
router.get("/capture-history", getAutoCaptureHistory);

module.exports = router;
