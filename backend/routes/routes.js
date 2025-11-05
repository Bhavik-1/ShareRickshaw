const express = require("express");
const router = express.Router();
const routesController = require("../controllers/routesController");
const authMiddleware = require("../middleware/auth");

// All routes endpoints require JWT authentication
router.post("/", authMiddleware, routesController.create);
router.put("/:id", authMiddleware, routesController.update);
router.delete("/:id", authMiddleware, routesController.delete);

// NEW: Endpoint for complex multimodal route search
router.post(
  "/multimodal",
  authMiddleware,
  routesController.findMultimodalRoute
);

module.exports = router;
