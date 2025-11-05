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
    // 1. Fetch current Shared Auto Stand Data (FIX for Issue #2)
    // -----------------------------------------------------
    const standsData = await fetchAllStandsData();

    // -----------------------------------------------------
    // 2. Option 1: Direct Auto Route (OSRM)
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
    // 3. Option 2: Shared Auto Route (Based Only on Stands DB + Walking)
    // -----------------------------------------------------

    const startPoint = { lat: parseFloat(startLat), lng: parseFloat(startLng) };
    const endPoint = { lat: parseFloat(endLat), lng: parseFloat(endLng) };

    // Haversine distance calculator
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in km
      const toRad = (deg) => (deg * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // ← FIXED
      return Math.round(R * c * 10) / 10; // in km, rounded to 1 decimal
    };

    // Find nearest stand to start and end
    function findNearestStand(point) {
      return standsData.reduce(
        (closest, stand) => {
          const dist = calculateDistance(
            point.lat,
            point.lng,
            stand.latitude,
            stand.longitude
          );
          if (dist < closest.distance) {
            return { stand, distance: dist };
          }
          return closest;
        },
        { stand: null, distance: Infinity }
      );
    }

    const nearestStartStand = findNearestStand(startPoint);
    const nearestEndStand = findNearestStand(endPoint);

    // Simple BFS-style route search between stands (based on routes in DB)
    function findSharedAutoPath(startStand, endStand, allStands) {
      const queue = [[startStand]];
      const visited = new Set();

      while (queue.length > 0) {
        const path = queue.shift();
        const lastStand = path[path.length - 1];
        if (lastStand.id === endStand.id) return path;

        if (visited.has(lastStand.id)) continue;
        visited.add(lastStand.id);

        for (const route of lastStand.routes) {
          const nextStand = allStands.find((s) => s.name === route.destination);
          if (nextStand && !visited.has(nextStand.id)) {
            queue.push([...path, nextStand]);
          }
        }
      }
      return null;
    }

    // Only build route if both stands are within walking range (2 km)
    if (
      nearestStartStand.stand &&
      nearestEndStand.stand &&
      nearestStartStand.distance < 2 &&
      nearestEndStand.distance < 2
    ) {
      const path = findSharedAutoPath(
        nearestStartStand.stand,
        nearestEndStand.stand,
        standsData
      );

      if (path && path.length > 1) {
        // Build route description dynamically
        let totalFare = 0;
        let totalTravelTime = 0;
        const steps = [];

        // Walk to nearest start stand
        steps.push({
          mode: "WALK",
          instruction: `Walk ${nearestStartStand.distance.toFixed(1)} km to **${
            nearestStartStand.stand.name
          } Stand**`,
          durationMinutes: Math.round(nearestStartStand.distance * 15),
          costRupees: 0,
        });

        // Auto hops between stands
        for (let i = 0; i < path.length - 1; i++) {
          const current = path[i];
          const next = path[i + 1];
          const route = current.routes.find((r) => r.destination === next.name);
          if (route) {
            totalFare += route.fare;
            totalTravelTime += parseFloat(
              route.travel_time.replace(" mins", "")
            );
            steps.push({
              mode: "SHARED_AUTO",
              instruction: `Take shared auto from **${current.name}** → **${next.name}** (₹${route.fare})`,
              durationMinutes: parseFloat(
                route.travel_time.replace(" mins", "")
              ),
              costRupees: route.fare,
            });
          }
        }

        // Walk from final stand to destination
        steps.push({
          mode: "WALK",
          instruction: `Walk ${nearestEndStand.distance.toFixed(1)} km from **${
            nearestEndStand.stand.name
          } Stand** to your destination.`,
          durationMinutes: Math.round(nearestEndStand.distance * 15),
          costRupees: 0,
        });

        totalTravelTime +=
          Math.round(nearestStartStand.distance * 15) +
          Math.round(nearestEndStand.distance * 15);

        totalFare += 10; // Add small buffer (extra cost for short walks)

        allRoutes.push({
          icon: "🛺",
          type: "Shared Auto Route (Actual from DB)",
          routeDescription: `A route using available shared auto stands and walking.`,
          estimatedCostRupees: totalFare,
          totalTravelTimeMinutes: totalTravelTime,
          lineColor: "#4ECDC4",
          steps,
        });
      } else {
        allRoutes.push({
          icon: "🛺",
          type: "Shared Auto (No Direct Path Found)",
          routeDescription: `No direct shared auto route connects ${nearestStartStand.stand.name} → ${nearestEndStand.stand.name}.`,
          estimatedCostRupees: "N/A",
          totalTravelTimeMinutes: "N/A",
          lineColor: "#FFB74D",
          steps: [],
        });
      }
    }

    // -----------------------------------------------------
    // 4. Option 3: Shared Auto + Train Combo (Gemini API)
    // -----------------------------------------------------
    // Use Gemini for the complex, creative/combinatorial route planning
    const geminiRoute = await geminiFindRoute(
      startLat,
      startLng,
      endLat,
      endLng,
      standsData
    );

    allRoutes.push({
      icon: "🚆",
      type: "Train + Shared Auto Combo (Western Line)",
      routeDescription: geminiRoute.routeDescription,
      estimatedCostRupees: geminiRoute.estimatedCostRupees,
      totalTravelTimeMinutes: geminiRoute.totalTravelTimeMinutes,
      lineColor: "#FFA502", // Orange for train combo
      steps: geminiRoute.steps,
    });

    // -----------------------------------------------------
    // 5. Respond
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
