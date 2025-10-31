const db = require('../config/database');
const {
  broadcastBookingRequest,
  notifyBookingAccepted,
  notifyBookingRejected,
  notifyTripStarted,
  notifyTripCompleted,
  notifyBookingCancelled,
  notifyDriverLocationUpdate,
  notifyNewMessage
} = require('../services/socketEmitter');

// ===== BOOKING CREATION =====

// POST /api/bookings
// Create new booking request
exports.createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      pickup_latitude,
      pickup_longitude,
      pickup_address,
      destination_latitude,
      destination_longitude,
      destination_address,
      estimated_fare
    } = req.body;

    // Validation: Required fields
    if (!pickup_latitude || !pickup_longitude || !pickup_address ||
        !destination_latitude || !destination_longitude || !destination_address ||
        estimated_fare === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All fields required'
      });
    }

    // Validation: Latitude bounds (Mumbai: 18.8 - 19.3)
    if (pickup_latitude < 18.8 || pickup_latitude > 19.3 ||
        destination_latitude < 18.8 || destination_latitude > 19.3) {
      return res.status(400).json({
        success: false,
        message: 'Pickup/destination location outside Mumbai'
      });
    }

    // Validation: Longitude bounds (Mumbai: 72.7 - 73.0)
    if (pickup_longitude < 72.7 || pickup_longitude > 73.0 ||
        destination_longitude < 72.7 || destination_longitude > 73.0) {
      return res.status(400).json({
        success: false,
        message: 'Pickup/destination location outside Mumbai'
      });
    }

    // Validation: Address length
    if (pickup_address.trim().length < 5 || pickup_address.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Pickup address must be 5-255 characters'
      });
    }

    if (destination_address.trim().length < 5 || destination_address.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Destination address must be 5-255 characters'
      });
    }

    // Validation: Fare range (₹10 - ₹1000)
    const fare = parseFloat(estimated_fare);
    if (fare < 10 || fare > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Fare must be between ₹10 and ₹1000'
      });
    }

    // Check if at least one driver is online/available
    const [drivers] = await db.query(
      `SELECT id FROM driver_status WHERE is_online = TRUE`
    );

    if (drivers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No drivers currently available'
      });
    }

    // Select first available driver (simple assignment)
    const driverId = drivers[0].id;

    // Create booking
    const [result] = await db.query(
      `INSERT INTO bookings
       (user_id, driver_id, pickup_latitude, pickup_longitude, destination_latitude,
        destination_longitude, pickup_address, destination_address, estimated_fare, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested')`,
      [userId, driverId, pickup_latitude, pickup_longitude, destination_latitude,
        destination_longitude, pickup_address.trim(), destination_address.trim(), fare]
    );

    const bookingId = result.insertId;

    // Broadcast to all online drivers
    broadcastBookingRequest({
      booking_id: bookingId,
      user_id: userId,
      pickup_address: pickup_address.trim(),
      destination_address: destination_address.trim(),
      estimated_fare: fare,
      pickup_lat: pickup_latitude,
      pickup_lng: pickup_longitude,
      requested_at: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Booking request created',
      data: {
        booking_id: bookingId,
        status: 'requested',
        estimated_fare: fare,
        requested_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking'
    });
  }
};

// ===== BOOKING STATUS =====

// GET /api/bookings/:id
// Get booking status and details
exports.getBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get booking
    const [bookings] = await db.query(
      `SELECT b.*, ad.driver_name, ad.license_plate
       FROM bookings b
       LEFT JOIN autowala_details ad ON b.driver_id = ad.user_id
       WHERE b.id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Check authorization (user or driver in booking)
    if (userId !== booking.user_id && userId !== booking.driver_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    // Get driver location if driver assigned
    let driverData = null;
    if (booking.driver_id) {
      const [driverStatus] = await db.query(
        `SELECT current_latitude, current_longitude FROM driver_status WHERE driver_id = ?`,
        [booking.driver_id]
      );
      if (driverStatus.length > 0) {
        driverData = {
          id: booking.driver_id,
          driver_name: booking.driver_name || 'Unknown',
          license_plate: booking.license_plate || 'N/A',
          current_latitude: driverStatus[0].current_latitude,
          current_longitude: driverStatus[0].current_longitude
        };
      }
    }

    res.json({
      success: true,
      data: {
        booking_id: booking.id,
        user_id: booking.user_id,
        driver_id: booking.driver_id,
        pickup_address: booking.pickup_address,
        destination_address: booking.destination_address,
        estimated_fare: parseFloat(booking.estimated_fare),
        status: booking.status,
        requested_at: booking.requested_at,
        accepted_at: booking.accepted_at,
        started_at: booking.started_at,
        completed_at: booking.completed_at,
        driver: driverData
      }
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
};

// ===== DRIVER ACTIONS =====

// POST /api/bookings/:id/accept
// Driver accepts booking
exports.acceptBooking = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { id } = req.params;

    // Get booking
    const [bookings] = await db.query(
      `SELECT * FROM bookings WHERE id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Check booking status
    if (booking.status !== 'requested') {
      return res.status(400).json({
        success: false,
        message: 'Booking already accepted/cancelled'
      });
    }

    // Check if driver is online
    const [driverStatus] = await db.query(
      `SELECT is_online FROM driver_status WHERE driver_id = ?`,
      [driverId]
    );

    if (driverStatus.length === 0 || !driverStatus[0].is_online) {
      return res.status(400).json({
        success: false,
        message: 'You must be online to accept bookings'
      });
    }

    // Check if driver has active booking
    const [activeBookings] = await db.query(
      `SELECT id FROM bookings WHERE driver_id = ? AND status = 'in_transit'`,
      [driverId]
    );

    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot accept, you have active booking'
      });
    }

    // Update booking status
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query(
      `UPDATE bookings SET status = 'accepted', accepted_at = ? WHERE id = ?`,
      [now, id]
    );

    // Get driver details
    const [driverDetails] = await db.query(
      `SELECT ad.driver_name, ad.license_plate, ds.current_latitude, ds.current_longitude
       FROM autowala_details ad
       LEFT JOIN driver_status ds ON ad.user_id = ds.driver_id
       WHERE ad.user_id = ?`,
      [driverId]
    );

    // Notify user
    notifyBookingAccepted(booking.user_id, {
      booking_id: id,
      driver_id: driverId,
      driver_name: driverDetails[0]?.driver_name || 'Driver',
      license_plate: driverDetails[0]?.license_plate || 'N/A',
      driver_lat: driverDetails[0]?.current_latitude,
      driver_lng: driverDetails[0]?.current_longitude,
      accepted_at: now
    });

    res.json({
      success: true,
      message: 'Booking accepted',
      data: {
        booking_id: id,
        status: 'accepted',
        accepted_at: now
      }
    });

  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept booking'
    });
  }
};

// POST /api/bookings/:id/reject
// Driver rejects booking
exports.rejectBooking = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    // Get booking
    const [bookings] = await db.query(
      `SELECT * FROM bookings WHERE id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Check booking status
    if (booking.status !== 'requested') {
      return res.status(400).json({
        success: false,
        message: 'Booking already accepted/cancelled'
      });
    }

    // Validate reason (optional but encouraged)
    let rejectionReason = reason || 'Driver rejected';
    if (reason && (reason.trim().length < 5 || reason.trim().length > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason must be 5-100 characters if provided'
      });
    }

    if (reason) {
      rejectionReason = reason.trim();
    }

    // Update booking status
    await db.query(
      `UPDATE bookings SET status = 'cancelled', cancelled_reason = ? WHERE id = ?`,
      [rejectionReason, id]
    );

    // Notify user
    notifyBookingRejected(booking.user_id, {
      booking_id: id,
      driver_id: driverId,
      reason: rejectionReason
    });

    res.json({
      success: true,
      message: 'Booking rejected',
      data: {
        booking_id: id,
        status: 'cancelled',
        cancelled_reason: rejectionReason
      }
    });

  } catch (error) {
    console.error('Reject booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject booking'
    });
  }
};

// POST /api/bookings/:id/start
// Driver starts trip
exports.startTrip = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { id } = req.params;

    // Get booking
    const [bookings] = await db.query(
      `SELECT * FROM bookings WHERE id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Check authorization
    if (booking.driver_id !== driverId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Check booking status
    if (booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Booking not in accepted state'
      });
    }

    // Update booking status and driver availability
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query(
      `UPDATE bookings SET status = 'in_transit', started_at = ? WHERE id = ?`,
      [now, id]
    );

    // Set driver as busy
    await db.query(
      `UPDATE driver_status SET availability_status = 'busy', current_booking_id = ? WHERE driver_id = ?`,
      [id, driverId]
    );

    // Notify user
    notifyTripStarted(booking.user_id, {
      booking_id: id,
      started_at: now
    });

    res.json({
      success: true,
      message: 'Trip started',
      data: {
        booking_id: id,
        status: 'in_transit',
        started_at: now
      }
    });

  } catch (error) {
    console.error('Start trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start trip'
    });
  }
};

// POST /api/bookings/:id/complete
// Driver completes trip
exports.completeTrip = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { id } = req.params;

    // Get booking
    const [bookings] = await db.query(
      `SELECT * FROM bookings WHERE id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Check authorization
    if (booking.driver_id !== driverId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Check booking status
    if (booking.status !== 'in_transit') {
      return res.status(400).json({
        success: false,
        message: 'Booking not in transit'
      });
    }

    // Update booking status
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query(
      `UPDATE bookings SET status = 'completed', completed_at = ? WHERE id = ?`,
      [now, id]
    );

    // Set driver as available
    await db.query(
      `UPDATE driver_status SET availability_status = 'available', current_booking_id = NULL WHERE driver_id = ?`,
      [driverId]
    );

    // Notify user
    notifyTripCompleted(booking.user_id, {
      booking_id: id,
      completed_at: now
    });

    res.json({
      success: true,
      message: 'Trip completed',
      data: {
        booking_id: id,
        status: 'completed',
        completed_at: now
      }
    });

  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete trip'
    });
  }
};

// POST /api/bookings/:id/cancel
// User cancels booking
exports.cancelBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    // Get booking
    const [bookings] = await db.query(
      `SELECT * FROM bookings WHERE id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Check authorization
    if (booking.user_id !== userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Can only cancel if requested or accepted (not in_transit or completed)
    if (booking.status !== 'requested' && booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel in-transit or completed booking'
      });
    }

    // Validate reason
    let cancellationReason = reason || 'User cancelled';
    if (reason && (reason.trim().length < 5 || reason.trim().length > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason must be 5-100 characters if provided'
      });
    }

    if (reason) {
      cancellationReason = reason.trim();
    }

    // Update booking status
    await db.query(
      `UPDATE bookings SET status = 'cancelled', cancelled_reason = ? WHERE id = ?`,
      [cancellationReason, id]
    );

    // Notify driver
    notifyBookingCancelled(booking.driver_id, {
      booking_id: id,
      reason: cancellationReason
    });

    res.json({
      success: true,
      message: 'Booking cancelled',
      data: {
        booking_id: id,
        status: 'cancelled',
        cancelled_reason: cancellationReason
      }
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking'
    });
  }
};

// ===== DRIVER STATUS MANAGEMENT =====

// POST /api/driver-status/update
// Update driver online/offline and availability status
exports.updateDriverStatus = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { is_online, availability_status } = req.body;

    // Validation
    if (is_online === undefined) {
      return res.status(400).json({
        success: false,
        message: 'is_online field required'
      });
    }

    if (availability_status && !['available', 'busy'].includes(availability_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid availability status'
      });
    }

    // Get or create driver status
    const [existing] = await db.query(
      `SELECT id FROM driver_status WHERE driver_id = ?`,
      [driverId]
    );

    let finalAvailability = availability_status || 'available';
    if (!is_online) {
      finalAvailability = 'available'; // Reset to available when going offline
    }

    if (existing.length === 0) {
      // Create new status record
      await db.query(
        `INSERT INTO driver_status (driver_id, is_online, availability_status) VALUES (?, ?, ?)`,
        [driverId, is_online, finalAvailability]
      );
    } else {
      // Update existing status
      await db.query(
        `UPDATE driver_status SET is_online = ?, availability_status = ? WHERE driver_id = ?`,
        [is_online, finalAvailability, driverId]
      );
    }

    res.json({
      success: true,
      message: 'Status updated',
      data: {
        driver_id: driverId,
        is_online: is_online,
        availability_status: finalAvailability
      }
    });

  } catch (error) {
    console.error('Update driver status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
};

// POST /api/driver-status/location
// Update driver current location
exports.updateDriverLocation = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { latitude, longitude } = req.body;

    // Validation
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude required'
      });
    }

    // Validate bounds (Mumbai: 18.8-19.3, 72.7-73.0)
    if (latitude < 18.8 || latitude > 19.3) {
      return res.status(400).json({
        success: false,
        message: 'Latitude out of bounds'
      });
    }

    if (longitude < 72.7 || longitude > 73.0) {
      return res.status(400).json({
        success: false,
        message: 'Longitude out of bounds'
      });
    }

    // Get or create driver status
    const [existing] = await db.query(
      `SELECT id, current_booking_id FROM driver_status WHERE driver_id = ?`,
      [driverId]
    );

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (existing.length === 0) {
      await db.query(
        `INSERT INTO driver_status (driver_id, current_latitude, current_longitude, last_location_update)
         VALUES (?, ?, ?, ?)`,
        [driverId, latitude, longitude, now]
      );
    } else {
      await db.query(
        `UPDATE driver_status SET current_latitude = ?, current_longitude = ?, last_location_update = ?
         WHERE driver_id = ?`,
        [latitude, longitude, now, driverId]
      );
    }

    // If driver has active booking, notify user
    if (existing.length > 0 && existing[0].current_booking_id) {
      const bookingId = existing[0].current_booking_id;
      const [booking] = await db.query(
        `SELECT user_id FROM bookings WHERE id = ? AND status = 'in_transit'`,
        [bookingId]
      );

      if (booking.length > 0) {
        notifyDriverLocationUpdate(booking[0].user_id, {
          booking_id: bookingId,
          driver_id: driverId,
          latitude: latitude,
          longitude: longitude,
          timestamp: now
        });
      }
    }

    res.json({
      success: true,
      message: 'Location updated'
    });

  } catch (error) {
    console.error('Update driver location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
};

// ===== CHAT FUNCTIONALITY =====

// POST /api/bookings/:id/messages
// Send chat message
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { id } = req.params;
    const { message } = req.body;

    // Validation
    if (!message || message.trim().length === 0 || message.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message must be 1-500 characters'
      });
    }

    // Get booking
    const [bookings] = await db.query(
      `SELECT user_id, driver_id, status FROM bookings WHERE id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Check authorization (user or driver in booking)
    if (senderId !== booking.user_id && senderId !== booking.driver_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to message in this booking'
      });
    }

    // Don't allow messages in cancelled bookings
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot message in cancelled booking'
      });
    }

    // Determine sender role
    const senderRole = senderId === booking.user_id ? 'user' : 'driver';

    // Determine recipient
    const recipientId = senderId === booking.user_id ? booking.driver_id : booking.user_id;

    // Insert message
    const [result] = await db.query(
      `INSERT INTO booking_messages (booking_id, sender_id, sender_role, message_text)
       VALUES (?, ?, ?, ?)`,
      [id, senderId, senderRole, message.trim()]
    );

    const messageId = result.insertId;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Notify recipient
    notifyNewMessage(recipientId, {
      message_id: messageId,
      booking_id: id,
      sender_id: senderId,
      sender_role: senderRole,
      message_text: message.trim(),
      created_at: now
    });

    res.status(201).json({
      success: true,
      message: 'Message sent',
      data: {
        message_id: messageId,
        booking_id: id,
        sender_id: senderId,
        sender_role: senderRole,
        message_text: message.trim(),
        created_at: now
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};

// GET /api/bookings/:id/messages
// Get chat message history
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    let { limit, offset } = req.query;

    // Parse limit and offset with defaults
    limit = Math.min(parseInt(limit) || 50, 100);
    offset = parseInt(offset) || 0;

    // Get booking to check authorization
    const [bookings] = await db.query(
      `SELECT user_id, driver_id FROM bookings WHERE id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // Check authorization
    if (userId !== booking.user_id && userId !== booking.driver_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view messages'
      });
    }

    // Get messages
    const [messages] = await db.query(
      `SELECT id as message_id, sender_id, sender_role, message_text, created_at
       FROM booking_messages
       WHERE booking_id = ?
       ORDER BY created_at ASC
       LIMIT ? OFFSET ?`,
      [id, limit, offset]
    );

    // Get total count
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM booking_messages WHERE booking_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        messages: messages.map(m => ({
          message_id: m.message_id,
          sender_id: m.sender_id,
          sender_role: m.sender_role,
          message_text: m.message_text,
          created_at: m.created_at
        })),
        total: countResult[0].total
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
};
