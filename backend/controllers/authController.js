const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

// POST /api/auth/login
// Purpose: Admin login to get JWT token
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password required'
      });
    }

    if (username.trim() === '' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Username and password required'
      });
    }

    // Query user from database
    const [users] = await db.query(
      'SELECT id, username, password_hash, email FROM users WHERE username = ?',
      [username.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Compare password with bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    // Return success with token
    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST /api/auth/verify
// Purpose: Verify if JWT token is still valid
exports.verify = async (req, res) => {
  try {
    // Token is already verified by authMiddleware
    // Just return user data from req.user
    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username
      }
    });

  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
