const express = require('express');
const router = express.Router();
const standsController = require('../controllers/standsController');
const authMiddleware = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/', standsController.getAll);
router.get('/:id', standsController.getById);

// Protected routes (require JWT token)
router.post('/', authMiddleware, standsController.create);
router.put('/:id', authMiddleware, standsController.update);
router.delete('/:id', authMiddleware, standsController.delete);

module.exports = router;
