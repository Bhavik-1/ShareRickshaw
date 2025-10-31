/**
 * Socket.io Event Emitter Service
 * Provides utility functions to emit WebSocket events to users and drivers
 */

let io = null;

// Store active socket connections by user_id
const userSockets = new Map();

/**
 * Set the socket.io instance
 */
const setIoInstance = (ioInstance) => {
  io = ioInstance;
};

/**
 * Get the socket.io instance
 */
const getIoInstance = () => {
  return io;
};

/**
 * Register a user's socket connection
 */
const registerUserSocket = (userId, socket) => {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, []);
  }
  userSockets.get(userId).push(socket.id);
};

/**
 * Unregister a user's socket connection
 */
const unregisterUserSocket = (userId, socketId) => {
  if (userSockets.has(userId)) {
    const sockets = userSockets.get(userId);
    const index = sockets.indexOf(socketId);
    if (index > -1) {
      sockets.splice(index, 1);
    }
    if (sockets.length === 0) {
      userSockets.delete(userId);
    }
  }
};

/**
 * Emit event to specific user
 */
const emitToUser = (userId, eventName, data) => {
  if (!io) return false;

  if (userSockets.has(userId)) {
    const socketIds = userSockets.get(userId);
    socketIds.forEach((socketId) => {
      io.to(socketId).emit(eventName, data);
    });
    return true;
  }
  return false;
};

/**
 * Emit event to all online drivers
 */
const emitToAllOnlineDrivers = (eventName, data) => {
  if (!io) return;

  // Broadcast to all connected users with role 'autowala'
  io.emit('broadcast:drivers', {
    event: eventName,
    data: data
  });
};

/**
 * Emit event to specific driver
 */
const emitToDriver = (driverId, eventName, data) => {
  return emitToUser(driverId, eventName, data);
};

/**
 * Emit booking request to all online drivers
 */
const broadcastBookingRequest = (bookingData) => {
  if (!io) return;

  io.emit('booking_request', bookingData);
};

/**
 * Emit booking accepted to user
 */
const notifyBookingAccepted = (userId, driverData) => {
  return emitToUser(userId, 'booking_accepted', driverData);
};

/**
 * Emit booking rejected to user
 */
const notifyBookingRejected = (userId, data) => {
  return emitToUser(userId, 'booking_rejected', data);
};

/**
 * Emit trip started to user
 */
const notifyTripStarted = (userId, data) => {
  return emitToUser(userId, 'trip_started', data);
};

/**
 * Emit trip completed to user
 */
const notifyTripCompleted = (userId, data) => {
  return emitToUser(userId, 'trip_completed', data);
};

/**
 * Emit booking cancelled to driver
 */
const notifyBookingCancelled = (driverId, data) => {
  return emitToUser(driverId, 'booking_cancelled', data);
};

/**
 * Emit driver location update to user
 */
const notifyDriverLocationUpdate = (userId, locationData) => {
  return emitToUser(userId, 'driver_location_update', locationData);
};

/**
 * Emit new chat message to other party
 */
const notifyNewMessage = (recipientId, messageData) => {
  return emitToUser(recipientId, 'new_message', messageData);
};

module.exports = {
  setIoInstance,
  getIoInstance,
  registerUserSocket,
  unregisterUserSocket,
  emitToUser,
  emitToDriver,
  emitToAllOnlineDrivers,
  broadcastBookingRequest,
  notifyBookingAccepted,
  notifyBookingRejected,
  notifyTripStarted,
  notifyTripCompleted,
  notifyBookingCancelled,
  notifyDriverLocationUpdate,
  notifyNewMessage
};
