const db = require('../config/database');

/**
 * Calculate multi-modal routes between start and end points
 * Implements 4 route calculation algorithms as specified in planning.md
 */
class RouteController {
  /**
   * Main route calculation endpoint
   * Returns all 4 route types: stand_routes, hybrid_routes, direct_auto, train_route
   */
  static async calculateMultiModalRoutes(req, res) {
    try {
      const { startLat, startLng, endLat, endLng, startAddress, endAddress } = req.body;

      // Validate coordinates
      if (!startLat || !startLng || !endLat || !endLng) {
        return res.status(400).json({
          success: false,
          error: 'Start and end coordinates are required'
        });
      }

      // Mumbai bounds validation
      if (!RouteController.isWithinMumbaiBounds(startLat, startLng) ||
          !RouteController.isWithinMumbaiBounds(endLat, endLng)) {
        return res.status(400).json({
          success: false,
          error: 'Service area limited to Mumbai'
        });
      }

      // Calculate all route types in parallel for better performance
      const [standRoutes, hybridRoutes, directAutoRoute, trainRoute] = await Promise.all([
        RouteController.calculateStandRoutes(startLat, startLng, endLat, endLng),
        RouteController.calculateHybridRoutes(startLat, startLng, endLat, endLng),
        RouteController.calculateDirectAutoRoute(startLat, startLng, endLat, endLng),
        RouteController.calculateTrainRoute(startLat, startLng, endLat, endLng)
      ]);

      res.json({
        success: true,
        data: {
          routes: {
            stand_routes: standRoutes,
            hybrid_routes: hybridRoutes,
            direct_auto: directAutoRoute,
            train_route: trainRoute
          },
          search_metadata: {
            start_location: startAddress || `${startLat.toFixed(4)}, ${startLng.toFixed(4)}`,
            end_location: endAddress || `${endLat.toFixed(4)}, ${endLng.toFixed(4)}`,
            total_options: 4
          }
        }
      });

    } catch (error) {
      console.error('Error calculating multi-modal routes:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while calculating routes'
      });
    }
  }

  /**
   * Algorithm 1: Stand-Based Routes
   * Find stands with routes serving both start and end areas
   */
  static async calculateStandRoutes(startLat, startLng, endLat, endLng) {
    try {
      // Check database connection
      try {
        await db.query('SELECT 1');
      } catch (dbError) {
        console.error('Database connection error in calculateStandRoutes:', dbError);
        return [];
      }

      // Find stands within 2km of start location
      const nearbyStartStands = await RouteController.getNearbyStands(startLat, startLng, 2);

      const standRoutes = [];

      for (const stand of nearbyStartStands) {
        // Check if this stand has routes to the destination area
        const routes = await db.query(`
          SELECT r.*, s.name as stand_name, s.latitude as stand_lat, s.longitude as stand_lng
          FROM routes r
          JOIN stands s ON r.stand_id = s.id
          WHERE s.id = ? AND
                (
                  6371 * acos(cos(radians(?)) * cos(radians(r.destination_lat)) *
                   cos(radians(r.destination_lng) - radians(?)) + sin(radians(?)) *
                   sin(radians(r.destination_lat)))
                ) <= 2
        `, [stand.id, endLat, endLng, endLat]);

        for (const route of routes) {
          // Calculate total distance (start to stand + stand route)
          const startToStandDistance = RouteController.calculateDistance(
            startLat, startLng, route.stand_lat, route.stand_lng
          );

          const totalDistance = startToStandDistance +
            RouteController.calculateDistance(
              route.stand_lat, route.stand_lng,
              route.destination_lat, route.destination_lng
            );

          // Calculate total time (start to stand + route time + waiting time)
          const startToStandTime = Math.ceil(startToStandDistance * 60 / 20); // 20 km/h average
          const totalTime = startToStandTime + RouteController.parseTravelTime(route.travel_time) + 3; // 3 min waiting

          standRoutes.push({
            id: `stand_${route.id}`,
            type: 'stand_route',
            title: `Share Auto from ${route.stand_name}`,
            segments: [
              {
                mode: 'walk',
                from: 'Start Location',
                to: route.stand_name,
                distance: startToStandDistance,
                time: startToStandTime
              },
              {
                mode: 'auto',
                from: route.stand_name,
                to: route.destination,
                distance: RouteController.calculateDistance(
                  route.stand_lat, route.stand_lng,
                  route.destination_lat, route.destination_lng
                ),
                time: RouteController.parseTravelTime(route.travel_time),
                fare: route.fare
              }
            ],
            total_distance: totalDistance,
            total_time: totalTime,
            total_fare: route.fare,
            confidence: 0.9
          });
        }
      }

      return standRoutes;
    } catch (error) {
      console.error('Error calculating stand routes:', error);
      return [];
    }
  }

  /**
   * Algorithm 2: Hybrid Multi-Stand Routes
   * Connect multiple stand routes with walking segments using Dijkstra's algorithm
   */
  static async calculateHybridRoutes(startLat, startLng, endLat, endLng) {
    try {
      // Find all stands near start and end locations (within 2km)
      const startStands = await RouteController.getNearbyStands(startLat, startLng, 2);
      const endStands = await RouteController.getNearbyStands(endLat, endLng, 2);

      if (startStands.length === 0 || endStands.length === 0) {
        return [];
      }

      // Build graph of stands with connections
      const graph = await RouteController.buildStandGraph(startStands, endStands);

      // Find shortest paths using Dijkstra's algorithm
      const hybridRoutes = [];

      for (const startStand of startStands) {
        for (const endStand of endStands) {
          const path = RouteController.dijkstra(graph, startStand.id, endStand.id);

          if (path.length > 0) {
            const route = await RouteController.buildHybridRoute(
              path, startLat, startLng, endLat, endLng
            );
            if (route) {
              hybridRoutes.push(route);
            }
          }
        }
      }

      // Return top 3 hybrid routes by total time
      return hybridRoutes
        .sort((a, b) => a.total_time - b.total_time)
        .slice(0, 3);

    } catch (error) {
      console.error('Error calculating hybrid routes:', error);
      return [];
    }
  }

  /**
   * Algorithm 3: Direct Auto Route
   * Calculate direct auto route using existing fare system
   */
  static async calculateDirectAutoRoute(startLat, startLng, endLat, endLng) {
    try {
      // Use OSRM API for route geometry and distance
      const osrmResponse = await RouteController.getOSRMRoute(startLat, startLng, endLat, endLng);

      if (!osrmResponse) {
        return null;
      }

      const distance = osrmResponse.routes[0].distance / 1000; // Convert to km
      const duration = osrmResponse.routes[0].duration / 60; // Convert to minutes

      // Apply Mumbai traffic factor (1.2x base time)
      const travelTime = Math.ceil(duration * 1.2);

      // Add auto availability time (3-5 minutes in Mumbai)
      const totalTime = travelTime + 4;

      // Calculate fare using existing Mumbai government rates
      const fare = RouteController.calculateAutoFare(distance);

      return {
        id: 'direct_auto',
        type: 'direct_auto',
        title: 'Direct Auto',
        segments: [
          {
            mode: 'auto',
            from: 'Start Location',
            to: 'Destination',
            distance: distance,
            time: totalTime,
            fare: fare
          }
        ],
        total_distance: distance,
        total_time: totalTime,
        total_fare: fare,
        confidence: 0.8,
        geometry: osrmResponse.routes[0].geometry
      };
    } catch (error) {
      console.error('Error calculating direct auto route:', error);
      return null;
    }
  }

  /**
   * Algorithm 4: Train Routes (Western Line)
   * Integrate train travel where applicable
   */
  static async calculateTrainRoute(startLat, startLng, endLat, endLng) {
    try {
      // Find nearest Western Line stations to start and end points
      const nearestStartStation = await RouteController.getNearestTrainStation(startLat, startLng, 'Western');
      const nearestEndStation = await RouteController.getNearestTrainStation(endLat, endLng, 'Western');

      if (!nearestStartStation || !nearestEndStation) {
        return null;
      }

      // If stations are the same, train doesn't make sense
      if (nearestStartStation.id === nearestEndStation.id) {
        return null;
      }

      // Calculate distances to stations
      const startToStationDistance = RouteController.calculateDistance(
        startLat, startLng, nearestStartStation.latitude, nearestStartStation.longitude
      );

      const stationToDestinationDistance = RouteController.calculateDistance(
        nearestEndStation.latitude, nearestEndStation.longitude, endLat, endLng
      );

      // Calculate times (walking to stations: 5 km/h average)
      const startToStationTime = Math.ceil(startToStationDistance * 60 / 5);
      const stationToDestinationTime = Math.ceil(stationToDestinationDistance * 60 / 5);

      // Calculate train travel time (average 3 minutes between stations)
      const stationDistance = RouteController.calculateDistance(
        nearestStartStation.latitude, nearestStartStation.longitude,
        nearestEndStation.latitude, nearestEndStation.longitude
      );
      const trainTime = Math.ceil(stationDistance * 3 / 2); // Rough estimate

      // Add waiting time for train (3-5 minutes during peak hours)
      const trainWaitingTime = 4;

      const totalTime = startToStationTime + trainWaitingTime + trainTime + stationToDestinationTime;

      // Calculate fares (auto to stations + train fare)
      const startAutoFare = RouteController.calculateAutoFare(startToStationDistance);
      const endAutoFare = RouteController.calculateAutoFare(stationToDestinationDistance);
      const trainFare = Math.ceil(stationDistance / 2) * 5; // Rough estimate: ₹5 per 2km
      const totalFare = startAutoFare + trainFare + endAutoFare;

      return {
        id: 'train_route',
        type: 'train_route',
        title: 'Train + Auto',
        segments: [
          {
            mode: 'auto',
            from: 'Start Location',
            to: nearestStartStation.name,
            distance: startToStationDistance,
            time: startToStationTime,
            fare: startAutoFare
          },
          {
            mode: 'train',
            from: nearestStartStation.name,
            to: nearestEndStation.name,
            distance: stationDistance,
            time: trainTime + trainWaitingTime,
            fare: trainFare
          },
          {
            mode: 'auto',
            from: nearestEndStation.name,
            to: 'Destination',
            distance: stationToDestinationDistance,
            time: stationToDestinationTime,
            fare: endAutoFare
          }
        ],
        total_distance: startToStationDistance + stationDistance + stationToDestinationDistance,
        total_time: totalTime,
        total_fare: totalFare,
        confidence: 0.7
      };
    } catch (error) {
      console.error('Error calculating train route:', error);
      return null;
    }
  }

  /**
   * Get all train stations (for API endpoint)
   */
  static async getTrainStations(req, res) {
    try {
      const stations = await db.query(`
        SELECT id, name, latitude, longitude, line
        FROM train_stations
        ORDER BY line, name
      `);

      res.json({
        success: true,
        data: stations
      });
    } catch (error) {
      console.error('Error fetching train stations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch train stations'
      });
    }
  }

  // Helper methods

  static async getNearbyStands(lat, lng, radiusKm) {
    const stands = await db.query(`
      SELECT id, name, latitude, longitude, operating_hours,
             (6371 * acos(cos(radians(?)) * cos(radians(latitude)) *
              cos(radians(longitude) - radians(?)) + sin(radians(?)) *
              sin(radians(latitude)))) AS distance
      FROM stands
      HAVING distance <= ?
      ORDER BY distance
    `, [lat, lng, lat, radiusKm]);

    return stands;
  }

  static async getNearestTrainStation(lat, lng, line) {
    const stations = await db.query(`
      SELECT id, name, latitude, longitude, line,
             (6371 * acos(cos(radians(?)) * cos(radians(latitude)) *
              cos(radians(longitude) - radians(?)) + sin(radians(?)) *
              sin(radians(latitude)))) AS distance
      FROM train_stations
      WHERE line = ?
      HAVING distance <= 2
      ORDER BY distance
      LIMIT 1
    `, [lat, lng, lat, line]);

    return stations.length > 0 ? stations[0] : null;
  }

  static async buildStandGraph(startStands, endStands) {
    // Get all stand connections
    const connections = await db.query(`
      SELECT sc.from_stand_id, sc.to_stand_id, sc.distance_km, sc.fare, sc.travel_time_minutes,
             s1.name as from_name, s1.latitude as from_lat, s1.longitude as from_lng,
             s2.name as to_name, s2.latitude as to_lat, s2.longitude as to_lng
      FROM stand_connections sc
      JOIN stands s1 ON sc.from_stand_id = s1.id
      JOIN stands s2 ON sc.to_stand_id = s2.id
    `);

    // Build adjacency list
    const graph = {};

    // Initialize all stands
    const allStands = [...startStands, ...endStands];
    allStands.forEach(stand => {
      graph[stand.id] = {
        name: stand.name,
        lat: stand.latitude,
        lng: stand.longitude,
        edges: []
      };
    });

    // Add connections
    connections.forEach(conn => {
      if (graph[conn.from_stand_id] && graph[conn.to_stand_id]) {
        graph[conn.from_stand_id].edges.push({
          to: conn.to_stand_id,
          distance: conn.distance_km,
          time: conn.travel_time_minutes,
          fare: conn.fare
        });
      }
    });

    return graph;
  }

  static dijkstra(graph, startId, endId) {
    const distances = {};
    const previous = {};
    const unvisited = new Set();

    // Initialize distances
    Object.keys(graph).forEach(nodeId => {
      distances[nodeId] = nodeId === startId ? 0 : Infinity;
      previous[nodeId] = null;
      unvisited.add(nodeId);
    });

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentId = null;
      let minDistance = Infinity;

      unvisited.forEach(nodeId => {
        if (distances[nodeId] < minDistance) {
          currentId = nodeId;
          minDistance = distances[nodeId];
        }
      });

      if (currentId === null || currentId === endId) break;

      unvisited.delete(currentId);

      // Update distances to neighbors
      graph[currentId].edges.forEach(edge => {
        const altDistance = distances[currentId] + edge.time;
        if (altDistance < distances[edge.to]) {
          distances[edge.to] = altDistance;
          previous[edge.to] = currentId;
        }
      });
    }

    // Reconstruct path
    const path = [];
    let currentId = endId;

    while (currentId !== null) {
      path.unshift(currentId);
      currentId = previous[currentId];
    }

    return path[0] === startId ? path : [];
  }

  static async buildHybridRoute(path, startLat, startLng, endLat, endLng) {
    const segments = [];
    let totalDistance = 0;
    let totalTime = 0;
    let totalFare = 0;

    // Walk from start to first stand
    const firstStand = await db.query('SELECT * FROM stands WHERE id = ?', [path[0]]);
    if (firstStand.length === 0) return null;

    const startToStandDistance = RouteController.calculateDistance(
      startLat, startLng, firstStand[0].latitude, firstStand[0].longitude
    );
    const startToStandTime = Math.ceil(startToStandDistance * 60 / 5);

    segments.push({
      mode: 'walk',
      from: 'Start Location',
      to: firstStand[0].name,
      distance: startToStandDistance,
      time: startToStandTime
    });

    totalDistance += startToStandDistance;
    totalTime += startToStandTime;

    // Auto connections between stands
    for (let i = 0; i < path.length - 1; i++) {
      const connection = await db.query(`
        SELECT sc.*, s1.name as from_name, s2.name as to_name
        FROM stand_connections sc
        JOIN stands s1 ON sc.from_stand_id = s1.id
        JOIN stands s2 ON sc.to_stand_id = s2.id
        WHERE sc.from_stand_id = ? AND sc.to_stand_id = ?
      `, [path[i], path[i + 1]]);

      if (connection.length > 0) {
        const conn = connection[0];
        segments.push({
          mode: 'auto',
          from: conn.from_name,
          to: conn.to_name,
          distance: conn.distance_km,
          time: conn.travel_time_minutes,
          fare: conn.fare
        });

        totalDistance += conn.distance_km;
        totalTime += conn.travel_time_minutes;
        totalFare += conn.fare;
      }
    }

    // Walk from last stand to destination
    const lastStand = await db.query('SELECT * FROM stands WHERE id = ?', [path[path.length - 1]]);
    if (lastStand.length === 0) return null;

    const standToDestinationDistance = RouteController.calculateDistance(
      lastStand[0].latitude, lastStand[0].longitude, endLat, endLng
    );
    const standToDestinationTime = Math.ceil(standToDestinationDistance * 60 / 5);

    segments.push({
      mode: 'walk',
      from: lastStand[0].name,
      to: 'Destination',
      distance: standToDestinationDistance,
      time: standToDestinationTime
    });

    totalDistance += standToDestinationDistance;
    totalTime += standToDestinationTime;

    return {
      id: `hybrid_${path.join('_')}`,
      type: 'hybrid_route',
      title: 'Hybrid Route (Multiple Stands)',
      segments: segments,
      total_distance: totalDistance,
      total_time: totalTime,
      total_fare: totalFare,
      confidence: 0.6
    };
  }

  static async getOSRMRoute(startLat, startLng, endLat, endLng) {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
      );

      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('OSRM API error:', error);
      return null;
    }
  }

  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static parseTravelTime(travelTimeStr) {
    // Handle null, undefined, or empty values
    if (!travelTimeStr || typeof travelTimeStr !== 'string') {
      return 10; // Default 10 minutes
    }

    // Parse "10 mins", "15-20 mins", etc.
    const match = travelTimeStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 10;
  }

  static calculateAutoFare(distanceKm) {
    // Mumbai government fare rates (from existing script.js:113-119)
    const baseFare = 26; // Base fare for first 1.5 km
    const baseDistance = 1.5;
    const additionalRate = 17.14; // Per km beyond base distance

    if (distanceKm <= baseDistance) {
      return baseFare;
    }

    const additionalDistance = distanceKm - baseDistance;
    return baseFare + (additionalDistance * additionalRate);
  }

  static isWithinMumbaiBounds(lat, lng) {
    return lat >= 18.8 && lat <= 19.3 && lng >= 72.7 && lng <= 73.0;
  }
}

module.exports = RouteController;