const express = require('express');
const router = express.Router();
const routesController = require('../controllers/routesController');
const authMiddleware = require('../middleware/auth');
const RouteController = require('../controllers/routeController');

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
router.post('/calculate', authMiddleware, RouteController.calculateMultiModalRoutes);

/**
 * GET /api/routes/train-stations
 * Get all train stations data
 * Response: { success: boolean, data: [{ id, name, latitude, longitude, line }] }
 */
router.get('/train-stations', authMiddleware, RouteController.getTrainStations);

module.exports = router;
