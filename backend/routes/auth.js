const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/login - Public
router.post('/login', authController.login);

// POST /api/auth/verify - Requires token
router.post('/verify', authMiddleware, authController.verify);

module.exports = router;
