const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const bookingsController = require('../controllers/bookingsController');

// Booking endpoints (all require authentication)

// Create booking (users only)
router.post('/', auth, bookingsController.createBooking);

// Get booking status
router.get('/:id', auth, bookingsController.getBooking);

// Driver actions
router.post('/:id/accept', auth, bookingsController.acceptBooking);
router.post('/:id/reject', auth, bookingsController.rejectBooking);
router.post('/:id/start', auth, bookingsController.startTrip);
router.post('/:id/complete', auth, bookingsController.completeTrip);

// User actions
router.post('/:id/cancel', auth, bookingsController.cancelBooking);

// Chat endpoints
router.post('/:id/messages', auth, bookingsController.sendMessage);
router.get('/:id/messages', auth, bookingsController.getMessages);

// Driver status endpoints (for driver-status routes)
router.post('/status/update', auth, bookingsController.updateDriverStatus);
router.post('/status/location', auth, bookingsController.updateDriverLocation);

module.exports = router;
