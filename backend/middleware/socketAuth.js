const jwt = require('jsonwebtoken');

/**
 * Socket.io authentication middleware
 * Verifies JWT token and attaches user info to socket object
 */
const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');

    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    socket.username = decoded.username;

    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Invalid or expired token'));
  }
};

module.exports = socketAuth;
