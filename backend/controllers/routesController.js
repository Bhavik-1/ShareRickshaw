const db = require("../config/database");
const {
  findMultimodalRoute: geminiFindRoute,
} = require("../services/geminiService");
// FIX: Import the standsController's logic to fetch all stands
const standsController = require("./standsController");
// No need to fetch all stands here, we'll fetch them on demand inside the function.

// Helper function to fetch all stands data including routes
async function fetchAllStandsData() {
  // Reusing the logic from the standsController's getAll endpoint but without the express context
  try {
    // Query only for the stands, then their routes (similar to how getAll works)
    const [stands] = await db.query("SELECT * FROM stands ORDER BY name");

    // For each stand, get its routes
    const standsWithRoutes = await Promise.all(
      stands.map(async (stand) => {
        const [routes] = await db.query(
          "SELECT id, destination, fare, travel_time, destination_lat, destination_lng FROM routes WHERE stand_id = ? ORDER BY destination",
          [stand.id]
        );

        return {
          id: stand.id,
          name: stand.name,
          latitude: parseFloat(stand.latitude),
          longitude: parseFloat(stand.longitude),
          operating_hours: stand.operating_hours,
          routes: routes.map((route) => ({
            id: route.id,
            destination: route.destination,
            fare: parseFloat(route.fare),
            travel_time: route.travel_time,
            destination_lat: route.destination_lat
              ? parseFloat(route.destination_lat)
              : null,
            destination_lng: route.destination_lng
              ? parseFloat(route.destination_lng)
              : null,
          })),
        };
      })
    );
    return standsWithRoutes;
  } catch (error) {
    console.error("Database fetch error for stands data:", error);
    throw new Error("Failed to load shared auto stand data from database.");
  }
}

// POST /api/routes/multimodal
// Purpose: Find multiple travel options (Direct, Shared Auto, Train Combo)
exports.findMultimodalRoute = async (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.body;
  let allRoutes = [];

  // Basic validation
  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({
      success: false,
      message: "Start and end coordinates are required.",
    });
  }

  try {
    // -----------------------------------------------------
    // 1. Fetch current Shared Auto Stand Data
    // -----------------------------------------------------
    const standsData = await fetchAllStandsData();

    // -----------------------------------------------------
    // 2. Option 1: Direct Auto Route (OSRM) - The first option user wants to keep
    // -----------------------------------------------------
    // In a real app, we would make a POST request to OSRM.
    // Here, we simulate the structure.
    allRoutes.push({
      icon: "🚗",
      type: "Direct Auto Route (OSRM)",
      routeDescription: "Fastest road route using standard auto rickshaw.",
      estimatedCostRupees: "120-150", // Based on distance/fare calculator logic
      totalTravelTimeMinutes: "45",
      lineColor: "#FF6B6B", // Red for direct auto
      steps: [{ mode: "AUTO", instruction: "Take a direct auto rickshaw." }],
    });

    // -----------------------------------------------------
    // Option 2 (Original Shared Auto Route) is REMOVED as requested by the user.
    // -----------------------------------------------------

    // -----------------------------------------------------
    // 3. Option 2 (Original Option 3): Shared Auto + Train Combo (Smart AI Planner) - The second option user wants to keep
    // -----------------------------------------------------
    // Use the Smart AI Planner (replaces "Gemini API") for the complex, creative/combinatorial route planning
    const geminiRoute = await geminiFindRoute(
      startLat,
      startLng,
      endLat,
      endLng,
      standsData
    );

    allRoutes.push({
      icon: "🚆",
      // FIX: Changed type to give clearer indication of multimodal route
      type: "Multimodal Route (Smart AI Planner)",
      routeDescription: geminiRoute.routeDescription,
      estimatedCostRupees: geminiRoute.estimatedCostRupees,
      totalTravelTimeMinutes: geminiRoute.totalTravelTimeMinutes,
      lineColor: "#FFA502", // Orange for train combo
      steps: geminiRoute.steps,
    });

    // -----------------------------------------------------
    // 4. Respond
    // -----------------------------------------------------
    res.json({
      success: true,
      routes: allRoutes,
    });
  } catch (error) {
    console.error("Multimodal route processing error:", error);
    // Send a 500 error response with the detail that caused the crash
    res.status(500).json({
      success: false,
      message: `Failed to find multimodal routes: ${error.message}`,
    });
  }
};

// Placeholder functions for CRUD operations previously included in routesController
// These are included for completeness to ensure no other feature that references them breaks.
// The original implementation used placeholders, so we keep them for stability.

exports.create = async (req, res) => {
  res.status(501).json({
    success: false,
    message:
      "Route creation endpoint is currently not implemented in this version.",
  });
};

exports.update = async (req, res) => {
  res.status(501).json({
    success: false,
    message:
      "Route update endpoint is currently not implemented in this version.",
  });
};

exports.delete = async (req, res) => {
  res.status(501).json({
    success: false,
    message:
      "Route deletion endpoint is currently not implemented in this version.",
  });
};

// Exports for other modules (routes.js)
module.exports = {
  create: exports.create,
  update: exports.update,
  delete: exports.delete,
  findMultimodalRoute: exports.findMultimodalRoute,
};
