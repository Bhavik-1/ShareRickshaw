const express = require("express");
const {
  triggerSOS,
  getSOSStatus,
  getSOSLogs,
  testEmailService,
  captureAutoNumber,
  getAutoCaptureHistory,
  sendNightLocationUpdate, // Import existing function
  checkRecentAutoCapture, // Import new function
} = require("../controllers/safetyController");

console.log("Safety routes: Controller loaded, functions:", {
  triggerSOS: typeof triggerSOS,
  getSOSStatus: typeof getSOSStatus,
  getSOSLogs: typeof getSOSLogs,
  testEmailService: typeof testEmailService,
  captureAutoNumber: typeof captureAutoNumber,
  getAutoCaptureHistory: typeof getAutoCaptureHistory,
  sendNightLocationUpdate: typeof sendNightLocationUpdate,
  checkRecentAutoCapture: typeof checkRecentAutoCapture, // Check new function
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

// AUTO CAPTURE ROUTES
// POST /api/safety/capture-auto - Capture image, extract number plate, and save
router.post("/capture-auto", captureAutoNumber);

// GET /api/safety/capture-history - Get all previous captures for the user
router.get("/capture-history", getAutoCaptureHistory);

// NEW ROUTE FOR CHECKING RECENT CAPTURES
// GET /api/safety/night-track/recent-capture - Check if a plate was captured in the last 3 hours
router.get("/night-track/recent-capture", checkRecentAutoCapture);

// POST /api/safety/night-track/update - Send live location update to contacts
router.post("/night-track/update", sendNightLocationUpdate);

module.exports = router;
