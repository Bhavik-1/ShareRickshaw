const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');

// All profile routes require authentication
// GET /api/profile - Get current user's profile
router.get('/', authMiddleware, profileController.getProfile);

// PATCH /api/profile - Update profile
router.patch('/', authMiddleware, profileController.updateProfile);

// POST /api/profile/emergency-contacts - Add emergency contact
router.post('/emergency-contacts', authMiddleware, profileController.addEmergencyContact);

// DELETE /api/profile/emergency-contacts/:id - Delete emergency contact
router.delete('/emergency-contacts/:id', authMiddleware, profileController.deleteEmergencyContact);

module.exports = router;
