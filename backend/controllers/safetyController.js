const db = require('../config/database');
const emailService = require('../services/emailService');

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

    if (lastSosTime && (now - lastSosTime) < 60000) { // 1 minute cooldown
      const remainingTime = Math.ceil((60000 - (now - lastSosTime)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingTime} seconds before triggering another SOS alert`,
        cooldownRemaining: remainingTime
      });
    }

    // Get user information
    const [users] = await db.query(
      'SELECT id, username, full_name, phone_number, email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];
    const userName = user.full_name || user.username;

    // Get emergency contacts
    const [emergencyContacts] = await db.query(
      'SELECT id, contact_name, contact_phone, contact_email FROM emergency_contacts WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    );

    if (emergencyContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No emergency contacts found. Please add emergency contacts before triggering SOS.',
        requiresContacts: true
      });
    }

    // Filter contacts that have email addresses
    const contactsWithEmail = emergencyContacts.filter(contact => contact.contact_email);

    if (contactsWithEmail.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No emergency contacts with email addresses found. Please add email addresses to your emergency contacts.',
        requiresEmails: true
      });
    }

    // Get location from request body or try to get GPS location
    let location = req.body.location;

    if (!location) {
      // If no location provided, return error - frontend should handle GPS
      return res.status(400).json({
        success: false,
        message: 'Location information is required for SOS alert',
        requiresLocation: true
      });
    }

    // Validate location data
    if (!location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude are required'
      });
    }

    // Log SOS trigger for audit
    await db.query(
      'INSERT INTO sos_logs (user_id, latitude, longitude, accuracy, contacts_count, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [userId, location.latitude, location.longitude, location.accuracy || null, contactsWithEmail.length]
    );

    // Update cooldown
    sosCooldowns.set(cooldownKey, now);

    // Send emergency emails
    console.log(`Sending SOS alerts to ${contactsWithEmail.length} contacts for user ${userName}`);

    const emailResults = await emailService.sendEmergencyAlertsToMultipleContacts(
      contactsWithEmail,
      userName,
      location
    );

    // Calculate success statistics
    const successfulEmails = emailResults.filter(result => result.success);
    const failedEmails = emailResults.filter(result => !result.success);

    // Log results for debugging
    console.log(`SOS Email Results: ${successfulEmails.length} successful, ${failedEmails.length} failed`);
    if (failedEmails.length > 0) {
      console.error('Failed emails:', failedEmails);
    }

    // Return response with detailed results
    const response = {
      success: successfulEmails.length > 0,
      message: successfulEmails.length > 0
        ? `Emergency alert sent to ${successfulEmails.length} of ${contactsWithEmail.length} contacts`
        : 'Failed to send emergency alerts. Please try again.',
      sosId: `${userId}_${Date.now()}`, // Unique SOS ID for tracking
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      },
      contactsNotified: successfulEmails.length,
      totalContacts: contactsWithEmail.length,
      timestamp: new Date().toISOString(),
      emailResults: {
        successful: successfulEmails.map(result => ({
          contactId: result.contact.id,
          contactName: result.contact.contact_name,
          email: result.contact.contact_email,
          messageId: result.messageId
        })),
        failed: failedEmails.map(result => ({
          contactId: result.contact.id,
          contactName: result.contact.contact_name,
          email: result.contact.contact_email,
          error: result.error,
          errorCode: result.errorCode
        }))
      }
    };

    // Send user copy if email service is working
    if (user.email && emailService.isServiceReady()) {
      try {
        await emailService.sendEmergencyAlert(user.email, userName, location);
        console.log(`SOS confirmation sent to user at ${user.email}`);
      } catch (error) {
        console.error(`Failed to send SOS confirmation to user: ${error.message}`);
      }
    }

    // Send appropriate HTTP status
    const statusCode = successfulEmails.length > 0 ? 200 : 500;
    res.status(statusCode).json(response);

  } catch (error) {
    console.error('SOS trigger error:', error);

    // Remove cooldown on error to allow retry
    const cooldownKey = `user_${userId}`;
    sosCooldowns.delete(cooldownKey);

    res.status(500).json({
      success: false,
      message: 'Failed to process SOS alert. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// GET /api/sos/status
// Purpose: Check if user can trigger SOS (cooldown status)
exports.getSOSStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const cooldownKey = `user_${userId}`;
    const now = Date.now();
    const lastSosTime = sosCooldowns.get(cooldownKey);

    let canTrigger = true;
    let cooldownRemaining = 0;

    if (lastSosTime && (now - lastSosTime) < 60000) {
      canTrigger = false;
      cooldownRemaining = Math.ceil((60000 - (now - lastSosTime)) / 1000);
    }

    // Get emergency contacts count
    const [contactCount] = await db.query(
      'SELECT COUNT(*) as count FROM emergency_contacts WHERE user_id = ? AND contact_email IS NOT NULL',
      [userId]
    );

    res.json({
      success: true,
      canTrigger: canTrigger,
      cooldownRemaining: cooldownRemaining,
      emergencyContactsWithEmail: contactCount[0].count,
      emailServiceReady: emailService.isServiceReady()
    });

  } catch (error) {
    console.error('SOS status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SOS status'
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
      logs: logs.map(log => ({
        id: log.id,
        location: {
          latitude: parseFloat(log.latitude),
          longitude: parseFloat(log.longitude),
          accuracy: log.accuracy ? parseFloat(log.accuracy) : null
        },
        contactsNotified: log.contacts_count,
        timestamp: log.created_at,
        googleMapsLink: `https://www.google.com/maps?q=${log.latitude},${log.longitude}&z=18`
      }))
    });

  } catch (error) {
    console.error('SOS logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SOS logs'
    });
  }
};

// POST /api/sos/test-email
// Purpose: Test email service configuration (admin only or with special flag)
exports.testEmailService = async (req, res) => {
  try {
    // Only allow in development or with special test flag
    if (process.env.NODE_ENV === 'production' && !req.body.forceTest) {
      return res.status(403).json({
        success: false,
        message: 'Email testing not allowed in production'
      });
    }

    const result = await emailService.testConfiguration();

    res.json({
      success: result.success,
      message: result.message,
      messageId: result.messageId || null
    });

  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test email service',
      error: error.message
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
  triggerSOS,
  getSOSStatus,
  getSOSLogs,
  testEmailService
};