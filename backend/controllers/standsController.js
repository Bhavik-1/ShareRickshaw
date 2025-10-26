const db = require('../config/database');

// GET /api/stands
// Purpose: Fetch all stands with their routes (public endpoint)
exports.getAll = async (req, res) => {
  try {
    const { search } = req.query;

    let query = 'SELECT * FROM stands';
    let params = [];

    // Add search filter if provided
    if (search && search.trim() !== '') {
      query += ' WHERE name LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    query += ' ORDER BY name';

    // Get all stands
    const [stands] = await db.query(query, params);

    // For each stand, get its routes
    const standsWithRoutes = await Promise.all(
      stands.map(async (stand) => {
        const [routes] = await db.query(
          'SELECT id, destination, fare, travel_time, destination_lat, destination_lng FROM routes WHERE stand_id = ? ORDER BY destination',
          [stand.id]
        );

        return {
          id: stand.id,
          name: stand.name,
          latitude: parseFloat(stand.latitude),
          longitude: parseFloat(stand.longitude),
          operating_hours: stand.operating_hours,
          routes: routes.map(route => ({
            id: route.id,
            destination: route.destination,
            fare: parseFloat(route.fare),
            travel_time: route.travel_time,
            destination_lat: route.destination_lat ? parseFloat(route.destination_lat) : null,
            destination_lng: route.destination_lng ? parseFloat(route.destination_lng) : null
          }))
        };
      })
    );

    res.json({
      success: true,
      count: standsWithRoutes.length,
      stands: standsWithRoutes
    });

  } catch (error) {
    console.error('Get stands error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stands'
    });
  }
};

// GET /api/stands/:id
// Purpose: Fetch single stand with routes (public endpoint)
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get stand
    const [stands] = await db.query(
      'SELECT * FROM stands WHERE id = ?',
      [id]
    );

    if (stands.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stand not found'
      });
    }

    const stand = stands[0];

    // Get routes for this stand
    const [routes] = await db.query(
      'SELECT id, destination, fare, travel_time FROM routes WHERE stand_id = ? ORDER BY destination',
      [id]
    );

    res.json({
      success: true,
      stand: {
        id: stand.id,
        name: stand.name,
        latitude: parseFloat(stand.latitude),
        longitude: parseFloat(stand.longitude),
        operating_hours: stand.operating_hours,
        routes: routes.map(route => ({
          id: route.id,
          destination: route.destination,
          fare: parseFloat(route.fare),
          travel_time: route.travel_time
        }))
      }
    });

  } catch (error) {
    console.error('Get stand by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST /api/stands
// Purpose: Create new stand (protected - requires JWT)
exports.create = async (req, res) => {
  try {
    const { name, latitude, longitude, operating_hours } = req.body;

    // Validation
    if (!name || !latitude || !longitude || !operating_hours) {
      return res.status(400).json({
        success: false,
        message: 'All fields required'
      });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 3 and 100 characters'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Validate Mumbai coordinates
    if (lat < 18.8 || lat > 19.3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude - must be between 18.8 and 19.3'
      });
    }

    if (lng < 72.7 || lng > 73.0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid longitude - must be between 72.7 and 73.0'
      });
    }

    if (!operating_hours.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Operating hours required'
      });
    }

    // Insert stand
    const [result] = await db.query(
      'INSERT INTO stands (name, latitude, longitude, operating_hours) VALUES (?, ?, ?, ?)',
      [trimmedName, lat, lng, operating_hours.trim()]
    );

    // Get created stand
    const [stands] = await db.query(
      'SELECT * FROM stands WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Stand created successfully',
      stand: {
        id: stands[0].id,
        name: stands[0].name,
        latitude: parseFloat(stands[0].latitude),
        longitude: parseFloat(stands[0].longitude),
        operating_hours: stands[0].operating_hours,
        created_at: stands[0].created_at
      }
    });

  } catch (error) {
    console.error('Create stand error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stand'
    });
  }
};

// PUT /api/stands/:id
// Purpose: Update existing stand (protected - requires JWT)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, operating_hours } = req.body;

    // Check if stand exists
    const [existingStands] = await db.query(
      'SELECT * FROM stands WHERE id = ?',
      [id]
    );

    if (existingStands.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stand not found'
      });
    }

    // Check if at least one field is provided
    if (!name && !latitude && !longitude && !operating_hours) {
      return res.status(400).json({
        success: false,
        message: 'At least one field required'
      });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (name) {
      const trimmedName = name.trim();
      if (trimmedName.length < 3 || trimmedName.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Name must be between 3 and 100 characters'
        });
      }
      updates.push('name = ?');
      params.push(trimmedName);
    }

    if (latitude !== undefined) {
      const lat = parseFloat(latitude);
      if (lat < 18.8 || lat > 19.3) {
        return res.status(400).json({
          success: false,
          message: 'Invalid latitude - must be between 18.8 and 19.3'
        });
      }
      updates.push('latitude = ?');
      params.push(lat);
    }

    if (longitude !== undefined) {
      const lng = parseFloat(longitude);
      if (lng < 72.7 || lng > 73.0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid longitude - must be between 72.7 and 73.0'
        });
      }
      updates.push('longitude = ?');
      params.push(lng);
    }

    if (operating_hours) {
      if (!operating_hours.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Operating hours cannot be empty'
        });
      }
      updates.push('operating_hours = ?');
      params.push(operating_hours.trim());
    }

    // Add id to params
    params.push(id);

    // Execute update
    await db.query(
      `UPDATE stands SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated stand
    const [updatedStands] = await db.query(
      'SELECT * FROM stands WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Stand updated successfully',
      stand: {
        id: updatedStands[0].id,
        name: updatedStands[0].name,
        latitude: parseFloat(updatedStands[0].latitude),
        longitude: parseFloat(updatedStands[0].longitude),
        operating_hours: updatedStands[0].operating_hours,
        updated_at: updatedStands[0].updated_at
      }
    });

  } catch (error) {
    console.error('Update stand error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stand'
    });
  }
};

// DELETE /api/stands/:id
// Purpose: Delete stand (cascade deletes routes) (protected - requires JWT)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if stand exists
    const [stands] = await db.query(
      'SELECT * FROM stands WHERE id = ?',
      [id]
    );

    if (stands.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stand not found'
      });
    }

    // Delete stand (routes will be cascade deleted due to foreign key constraint)
    await db.query('DELETE FROM stands WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Stand and all associated routes deleted successfully'
    });

  } catch (error) {
    console.error('Delete stand error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete stand'
    });
  }
};
