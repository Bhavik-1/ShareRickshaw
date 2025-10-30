const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/login - Public (Admin login)
router.post('/login', authController.login);

// POST /api/auth/signup - Public (Regular user signup)
router.post('/signup', authController.signup);

// POST /api/auth/signup-autowala - Public (Autowala signup)
router.post('/signup-autowala', authController.signupAutowala);

// POST /api/auth/login-user - Public (User/Autowala login)
router.post('/login-user', authController.loginUser);

// POST /api/auth/verify - Requires token
router.post('/verify', authMiddleware, authController.verify);

module.exports = router;
