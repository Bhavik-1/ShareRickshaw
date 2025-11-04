const db = require("../config/database");
const emailService = require("../services/emailService");
const { extractLicensePlate } = require("../services/geminiService"); // Import new service
// FIX: Corrected the relative path. It should be two levels up from 'backend/controllers'
const locationService = require("../../js/locationService");

console.log("Safety controller: Loading...");

// In-memory store for SOS cooldown tracking (in production, use Redis)
const sosCooldowns = new Map();

// POST /api/sos/trigger
// Purpose: Trigger SOS alert and send emergency emails to all contacts
exports.triggerSOS = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check SOS cooldown (prevent spam)
    const cooldownKey = `user_${userId}`;
    const now = Date.now();
    const lastSosTime = sosCooldowns.get(cooldownKey);

    if (lastSosTime && now - lastSosTime < 60000) {
      // 1 minute cooldown
      const remainingTime = Math.ceil((60000 - (now - lastSosTime)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingTime} seconds before triggering another SOS alert`,
        cooldownRemaining: remainingTime,
      });
    }

    // Get user information
    const [users] = await db.query(
      "SELECT id, username, full_name, phone_number, email FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];
    const userName = user.full_name || user.username;

    // Get emergency contacts
    const [emergencyContacts] = await db.query(
      "SELECT id, contact_name, contact_phone, contact_email FROM emergency_contacts WHERE user_id = ? ORDER BY created_at ASC",
      [userId]
    );

    if (emergencyContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No emergency contacts found. Please add emergency contacts before triggering SOS.",
        requiresContacts: true,
      });
    }

    // Filter contacts that have email addresses
    const contactsWithEmail = emergencyContacts.filter(
      (contact) => contact.contact_email
    );

    if (contactsWithEmail.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No emergency contacts with email addresses found. Please add email addresses to your emergency contacts.",
        requiresEmails: true,
      });
    }

    // Get location from request body or try to get GPS location
    let location = req.body.location;

    if (!location) {
      // If no location provided, return error - frontend should handle GPS
      return res.status(400).json({
        success: false,
        message: "Location information is required for SOS alert",
        requiresLocation: true,
      });
    }

    // Validate location data
    if (!location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    // Log SOS trigger for audit
    await db.query(
      "INSERT INTO sos_logs (user_id, latitude, longitude, accuracy, contacts_count, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [
        userId,
        location.latitude,
        location.longitude,
        location.accuracy || null,
        contactsWithEmail.length,
      ]
    );

    // Update cooldown
    sosCooldowns.set(cooldownKey, now);

    // Send emergency emails
    console.log(
      `Sending SOS alerts to ${contactsWithEmail.length} contacts for user ${userName}`
    );

    const emailResults =
      await emailService.sendEmergencyAlertsToMultipleContacts(
        contactsWithEmail,
        userName,
        location
      );

    // Calculate success statistics
    const successfulEmails = emailResults.filter((result) => result.success);
    const failedEmails = emailResults.filter((result) => !result.success);

    // Log results for debugging
    console.log(
      `SOS Email Results: ${successfulEmails.length} successful, ${failedEmails.length} failed`
    );
    if (failedEmails.length > 0) {
      console.error("Failed emails:", failedEmails);
    }

    // Return response with detailed results
    const response = {
      success: successfulEmails.length > 0,
      message:
        successfulEmails.length > 0
          ? `Emergency alert sent to ${successfulEmails.length} of ${contactsWithEmail.length} contacts`
          : "Failed to send emergency alerts. Please try again.",
      sosId: `${userId}_${Date.now()}`, // Unique SOS ID for tracking
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      },
      contactsNotified: successfulEmails.length,
      totalContacts: contactsWithEmail.length,
      timestamp: new Date().toISOString(),
      emailResults: {
        successful: successfulEmails.map((result) => ({
          contactId: result.contact.id,
          contactName: result.contact.contact_name,
          email: result.contact.contact_email,
          messageId: result.messageId,
        })),
        failed: failedEmails.map((result) => ({
          contactId: result.contact.id,
          contactName: result.contact.contact_name,
          email: result.contact.contact_email,
          error: result.error,
          errorCode: result.errorCode,
        })),
      },
    };

    // Send user copy if email service is working
    if (user.email && emailService.isServiceReady()) {
      try {
        await emailService.sendEmergencyAlert(user.email, userName, location);
        console.log(`SOS confirmation sent to user at ${user.email}`);
      } catch (error) {
        console.error(
          `Failed to send SOS confirmation to user: ${error.message}`
        );
      }
    }

    // Send appropriate HTTP status
    const statusCode = successfulEmails.length > 0 ? 200 : 500;
    res.status(statusCode).json(response);
  } catch (error) {
    console.error("SOS trigger error:", error);

    // Remove cooldown on error to allow retry
    const cooldownKey = `user_${userId}`;
    sosCooldowns.delete(cooldownKey);

    res.status(500).json({
      success: false,
      message: "Failed to process SOS alert. Please try again.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// --- NEW FUNCTION: Check if a plate has been captured in the last 3 hours ---
exports.checkRecentAutoCapture = async (req, res) => {
  try {
    const userId = req.user.id;

    // Calculate timestamp for 3 hours ago
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const [recentCapture] = await db.query(
      `SELECT license_plate, captured_at 
       FROM auto_captures 
       WHERE user_id = ? AND captured_at >= ?
       ORDER BY captured_at DESC
       LIMIT 1`,
      [userId, threeHoursAgo]
    );

    if (recentCapture.length > 0) {
      // Plate found in the last 3 hours
      return res.json({
        success: true,
        isRecent: true,
        license_plate: recentCapture[0].license_plate,
        captured_at: recentCapture[0].captured_at,
        message: `License plate ${recentCapture[0].license_plate} was captured recently.`,
      });
    }

    // No recent plate found
    res.json({
      success: true,
      isRecent: false,
      message: "No recent license plate capture found.",
    });
  } catch (error) {
    console.error("Check recent auto capture error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check recent auto capture.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// --- MODIFIED FUNCTION: Night Tracking Update ---

// POST /api/safety/night-track/update
// Purpose: Receive user's live location and auto number, and send tracking email.
exports.sendNightLocationUpdate = async (req, res) => {
  try {
    const userId = req.user.id;
    // Receive autoNumber directly from the request body
    const { latitude, longitude, accuracy } = req.body.location;
    const autoNumber = req.body.autoNumber || null; // New field

    // 1. Validate input
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    // 2. Get user information (name, email)
    const [users] = await db.query(
      "SELECT id, username, full_name, phone_number, email FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const user = users[0];
    const userName = user.full_name || user.username;

    // 3. Get emergency contacts with email
    const [emergencyContacts] = await db.query(
      "SELECT id, contact_name, contact_phone, contact_email FROM emergency_contacts WHERE user_id = ? AND contact_email IS NOT NULL ORDER BY created_at ASC",
      [userId]
    );

    // Check if any contacts are available to send to
    if (emergencyContacts.length === 0) {
      // NOTE: This intentionally returns 200 OK but sets success to false and includes a stop flag.
      return res.status(200).json({
        success: false,
        message:
          "No contacts with email configured for Night Mode tracking. Stopping updates.",
        noContacts: true,
      });
    }

    // 4. Prepare location object
    const location = { latitude, longitude, accuracy: accuracy || 0 };

    // 5. Send tracking emails to all contacts
    const trackingPromises = emergencyContacts.map((contact) =>
      emailService.sendLocationTrackingEmail(
        contact.contact_email,
        userName,
        location,
        autoNumber // Pass the received autoNumber to the email service
      )
    );

    const emailResults = await Promise.all(trackingPromises);
    const successfulEmails = emailResults.filter((result) => result.success);

    console.log(
      `Night Track: Sent updates to ${successfulEmails.length} contacts.`
    );

    res.json({
      success: successfulEmails.length > 0,
      message: `Location update sent to ${successfulEmails.length} contact(s).`,
      data: {
        license_plate: autoNumber, // Return the plate back to the client
        contactsSent: successfulEmails.length,
        totalContacts: emergencyContacts.length,
        location: location,
      },
    });
  } catch (error) {
    console.error("Night location update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send night location update.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// --- Existing SOS Routes (keeping for context) ---

// POST /api/safety/capture-auto
// Purpose: Process image, extract number plate via Gemini, and store data
exports.captureAutoNumber = async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageBase64, latitude, longitude } = req.body;

    if (!imageBase64 || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Image data, latitude, and longitude are required.",
      });
    }

    // 1. Extract License Plate using Gemini
    let licensePlate;
    try {
      licensePlate = await extractLicensePlate(imageBase64);
      console.log("Gemini extracted plate:", licensePlate);

      if (!licensePlate || licensePlate.length < 5) {
        return res.status(400).json({
          success: false,
          message:
            "AI failed to detect a valid license plate in the image. Please try a clearer photo.",
        });
      }
    } catch (aiError) {
      console.error("AI Extraction Error:", aiError.message);
      // Log the AI error but continue to return a 503/500 if the service failed entirely
      return res.status(503).json({
        success: false,
        message:
          "AI service failed to process the image. Check Gemini API key or try again later.",
        details:
          process.env.NODE_ENV === "development" ? aiError.message : undefined,
      });
    }

    // 2. Reverse Geocode Location (Non-blocking, fallback to coords)
    let locationAddress = `${parseFloat(latitude).toFixed(6)}, ${parseFloat(
      longitude
    ).toFixed(6)}`;
    try {
      // FIX: Ensure that the locationService method is being called correctly
      // and handle the potential rejection by Nominatim.
      const addressData = await locationService.reverseGeocode(
        latitude,
        longitude
      );
      if (addressData && addressData.display_name) {
        locationAddress = addressData.display_name;
      }
    } catch (geoError) {
      // If location service fails (e.g., Nominatim times out), we should catch and continue
      console.warn(
        "Reverse geocoding failed, storing raw coordinates. Error:",
        geoError.message
      );
    }

    // 3. Store in Database
    const [result] = await db.query(
      `INSERT INTO auto_captures (user_id, license_plate, capture_latitude, capture_longitude, location_address)
             VALUES (?, ?, ?, ?, ?)`,
      [userId, licensePlate, latitude, longitude, locationAddress]
    );

    res.status(201).json({
      success: true,
      message: "License plate captured successfully.",
      data: {
        id: result.insertId,
        license_plate: licensePlate,
        location: locationAddress,
        captured_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Auto number capture error:", error);
    res.status(500).json({
      success: false,
      // FIX: Use a less specific error message to the user, but log the detail
      message: "Internal server error processing capture.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// GET /api/safety/capture-history
// Purpose: Fetch all previous auto number plate captures for the current user
exports.getAutoCaptureHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const [history] = await db.query(
      `SELECT id, license_plate, capture_latitude, capture_longitude, location_address, captured_at
             FROM auto_captures
             WHERE user_id = ?
             ORDER BY captured_at DESC
             LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      history: history.map((item) => ({
        id: item.id,
        license_plate: item.license_plate,
        latitude: parseFloat(item.capture_latitude),
        longitude: parseFloat(item.capture_longitude),
        location:
          item.location_address ||
          `${item.capture_latitude}, ${item.capture_longitude}`,
        captured_at: item.captured_at,
      })),
    });
  } catch (error) {
    console.error("Get capture history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch capture history.",
    });
  }
};

// GET /api/sos/status
// Purpose: Check SOS status and cooldown
exports.getSOSStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const cooldownKey = `user_${userId}`;
    const now = Date.now();
    const lastSosTime = sosCooldowns.get(cooldownKey);

    if (lastSosTime && now - lastSosTime < 60000) {
      canTrigger = false;
      cooldownRemaining = Math.ceil((60000 - (now - lastSosTime)) / 1000);
    }

    // Get emergency contacts count
    const [contactCount] = await db.query(
      "SELECT COUNT(*) as count FROM emergency_contacts WHERE user_id = ? AND contact_email IS NOT NULL",
      [userId]
    );

    res.json({
      success: true,
      canTrigger: canTrigger,
      cooldownRemaining: cooldownRemaining,
      emergencyContactsWithEmail: contactCount[0].count,
      emailServiceReady: emailService.isServiceReady(),
    });
  } catch (error) {
    console.error("SOS status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get SOS status",
    });
  }
};

// GET /api/sos/logs
// Purpose: Get SOS history for the current user
exports.getSOSLogs = async (req, res) => {
  try {
    const userId = req.user.id;

    const [logs] = await db.query(
      `SELECT id, latitude, longitude, accuracy, contacts_count, created_at
       FROM sos_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        location: {
          latitude: parseFloat(log.latitude),
          longitude: parseFloat(log.longitude),
          accuracy: log.accuracy ? parseFloat(log.accuracy) : null,
        },
        contactsNotified: log.contacts_count,
        timestamp: log.created_at,
        googleMapsLink: `https://www.google.com/maps?q=${log.latitude},${log.longitude}&z=18`,
      })),
    });
  } catch (error) {
    console.error("SOS logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get SOS logs",
    });
  }
};

// POST /api/sos/test-email
// Purpose: Test email service configuration (admin only or with special flag)
exports.testEmailService = async (req, res) => {
  try {
    // Only allow in development or with special test flag
    if (process.env.NODE_ENV === "production" && !req.body.forceTest) {
      return res.status(403).json({
        success: false,
        message: "Email testing not allowed in production",
      });
    }

    const result = await emailService.testConfiguration();

    res.json({
      success: result.success,
      message: result.message,
      messageId: result.messageId || null,
    });
  } catch (error) {
    console.error("Email test error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test email service",
      error: error.message,
    });
  }
};

// Helper function to clean up old cooldown entries (call periodically)
function cleanupCooldowns() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000; // 1 hour

  for (const [key, timestamp] of sosCooldowns.entries()) {
    if (now - timestamp > oneHour) {
      sosCooldowns.delete(key);
    }
  }
}

// Cleanup cooldowns every 10 minutes
setInterval(cleanupCooldowns, 10 * 60 * 1000);

module.exports = {
  triggerSOS: exports.triggerSOS,
  getSOSStatus: exports.getSOSStatus,
  getSOSLogs: exports.getSOSLogs,
  testEmailService: exports.testEmailService,
  captureAutoNumber: exports.captureAutoNumber, // Export existing function
  getAutoCaptureHistory: exports.getAutoCaptureHistory, // Export existing function
  sendNightLocationUpdate: exports.sendNightLocationUpdate, // Export modified function
  checkRecentAutoCapture: exports.checkRecentAutoCapture, // Export new function
};
