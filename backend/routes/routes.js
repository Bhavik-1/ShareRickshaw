const express = require('express');
const router = express.Router();
const routesController = require('../controllers/routesController');
const authMiddleware = require('../middleware/auth');
const RouteController = require('../controllers/routeController');

// Debug: Check if RouteController is loaded properly
console.log('RouteController loaded:', typeof RouteController);
console.log('calculateMultiModalRoutes method:', typeof RouteController.calculateMultiModalRoutes);

// All routes endpoints require JWT authentication
router.post('/', authMiddleware, routesController.create);
router.put('/:id', authMiddleware, routesController.update);
router.delete('/:id', authMiddleware, routesController.delete);

/**
 * POST /api/routes/calculate
 * Calculate multi-modal routes between start and end points
 * Request body: { startLat, startLng, endLat, endLng, startAddress?, endAddress? }
 * Response: { success: boolean, data: { routes: {...}, search_metadata: {...} } }
 */
router.post('/calculate', authMiddleware, (req, res) => {
  console.log('POST /api/routes/calculate endpoint hit');
  console.log('Request body:', req.body);
  RouteController.calculateMultiModalRoutes(req, res);
});

/**
 * GET /api/routes/train-stations
 * Get all train stations data
 * Response: { success: boolean, data: [{ id, name, latitude, longitude, line }] }
 */
router.get('/train-stations', authMiddleware, (req, res) => {
  console.log('GET /api/routes/train-stations endpoint hit');
  RouteController.getTrainStations(req, res);
});

module.exports = router;
