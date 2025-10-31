const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import database connection (establishes connection on load)
require('./config/database');

// Import route modules
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const standsRoutes = require('./routes/stands');
const routesRoutes = require('./routes/routes');
const bookingsRoutes = require('./routes/bookings');

// Import middleware and services
const socketAuth = require('./middleware/socketAuth');
const { setIoInstance } = require('./services/socketEmitter');

// Initialize Express app
const app = express();

// Create HTTP server for socket.io
const server = http.createServer(app);

// Initialize socket.io
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:5500'],
    credentials: true
  }
});

// Set io instance in socketEmitter service
setIoInstance(io);

// Middleware
app.use(cors({
  origin: ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:5500'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging (development)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// WebSocket connection handling
io.use(socketAuth);

io.on('connection', (socket) => {
  const userId = socket.userId;
  const userRole = socket.userRole;
  console.log(`User ${userId} (${userRole}) connected via WebSocket`);

  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected from WebSocket`);
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/stands', standsRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/driver-status', require('./routes/bookings')); // Reuse bookings route file for driver status

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Mumbai Share Auto API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      profile: '/api/profile',
      stands: '/api/stands',
      routes: '/api/routes'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
