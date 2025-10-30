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

// POST /api/auth/signup
// Purpose: Register new regular user account
exports.signup = async (req, res) => {
  try {
    const { username, email, phone_number, password, role } = req.body;

    // Validate all required fields present
    if (!username || !email || !phone_number || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Trim inputs
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone_number.trim();

    // Validate username format (3-50 characters, alphanumeric and underscores)
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    if (!usernameRegex.test(trimmedUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-50 characters (letters, numbers, underscores)'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Validate phone format (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be exactly 10 digits'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if email already exists (case-insensitive)
    const [existingEmail] = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?)',
      [trimmedEmail]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered'
      });
    }

    // Check if username already exists (case-insensitive)
    const [existingUsername] = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?)',
      [trimmedUsername]
    );

    if (existingUsername.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert into users table
    const [result] = await db.query(
      'INSERT INTO users (username, email, phone_number, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [trimmedUsername, trimmedEmail, trimmedPhone, passwordHash, 'user']
    );

    const userId = result.insertId;

    // Generate JWT token
    const token = jwt.sign(
      {
        id: userId,
        username: trimmedUsername,
        role: 'user'
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    // Return success response
    res.status(201).json({
      success: true,
      token: token,
      user: {
        id: userId,
        username: trimmedUsername,
        email: trimmedEmail,
        phone_number: trimmedPhone,
        role: 'user'
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST /api/auth/signup-autowala
// Purpose: Register new autowala account with driver and auto details
exports.signupAutowala = async (req, res) => {
  try {
    const { email, password, driver_name, phone_number, operating_location, license_plate, role } = req.body;

    // Validate all required fields present
    if (!email || !password || !driver_name || !phone_number || !operating_location || !license_plate || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Trim inputs
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedDriverName = driver_name.trim();
    const trimmedPhone = phone_number.trim();
    const trimmedLocation = operating_location.trim();
    const trimmedLicensePlate = license_plate.trim().toUpperCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Validate driver name length
    if (trimmedDriverName.length < 2 || trimmedDriverName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Driver name must be 2-100 characters'
      });
    }

    // Validate phone format (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be exactly 10 digits'
      });
    }

    // Validate operating location length
    if (trimmedLocation.length < 2 || trimmedLocation.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Operating location must be 2-100 characters'
      });
    }

    // Validate license plate format (5-20 alphanumeric)
    const licensePlateRegex = /^[A-Z0-9]{5,20}$/;
    if (!licensePlateRegex.test(trimmedLicensePlate)) {
      return res.status(400).json({
        success: false,
        message: 'License plate must be 5-20 alphanumeric characters'
      });
    }

    // Check if email already exists
    const [existingEmail] = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?)',
      [trimmedEmail]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered'
      });
    }

    // Check if license plate already exists
    const [existingLicense] = await db.query(
      'SELECT id FROM autowala_details WHERE license_plate = ?',
      [trimmedLicensePlate]
    );

    if (existingLicense.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This license plate is already registered'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Begin transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Insert into users table
      const [userResult] = await connection.query(
        'INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, NOW())',
        [trimmedEmail, passwordHash, 'autowala']
      );

      const userId = userResult.insertId;

      // Insert into autowala_details table
      await connection.query(
        'INSERT INTO autowala_details (user_id, license_plate, driver_name, operating_location, driver_phone, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, trimmedLicensePlate, trimmedDriverName, trimmedLocation, trimmedPhone]
      );

      // Commit transaction
      await connection.commit();
      connection.release();

      // Generate JWT token
      const token = jwt.sign(
        {
          id: userId,
          email: trimmedEmail,
          role: 'autowala'
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      );

      // Return success response
      res.status(201).json({
        success: true,
        token: token,
        user: {
          id: userId,
          email: trimmedEmail,
          role: 'autowala',
          username: trimmedDriverName,
          driver_name: trimmedDriverName,
          phone_number: trimmedPhone,
          operating_location: trimmedLocation,
          license_plate: trimmedLicensePlate
        }
      });

    } catch (transactionError) {
      // Rollback transaction on error
      await connection.rollback();
      connection.release();
      throw transactionError;
    }

  } catch (error) {
    console.error('Autowala signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST /api/auth/login-user
// Purpose: Login for regular users and autowalas (NOT admin)
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password present
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Trim and lowercase email
    const trimmedEmail = email.trim().toLowerCase();

    // Query user from database (only user or autowala roles)
    const [users] = await db.query(
      'SELECT id, username, email, phone_number, role, password_hash FROM users WHERE LOWER(email) = ? AND role IN (?, ?)',
      [trimmedEmail, 'user', 'autowala']
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Compare password with bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // If autowala, fetch autowala_details
    if (user.role === 'autowala') {
      const [autowalaDetails] = await db.query(
        'SELECT driver_name, driver_phone, operating_location, license_plate FROM autowala_details WHERE user_id = ?',
        [user.id]
      );

      const autowala = autowalaDetails[0];

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      );

      return res.json({
        success: true,
        token: token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          driver_name: autowala.driver_name,
          phone_number: autowala.driver_phone,
          operating_location: autowala.operating_location,
          license_plate: autowala.license_plate
        }
      });
    }

    // Regular user
    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role
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
