const db = require('../config/database');

// POST /api/routes
// Purpose: Add new route to a stand (protected - requires JWT)
exports.create = async (req, res) => {
  try {
    const { stand_id, destination, fare, travel_time } = req.body;

    // Validation
    if (!stand_id || !destination || !fare || !travel_time) {
      return res.status(400).json({
        success: false,
        message: 'All fields required'
      });
    }

    // Verify stand exists
    const [stands] = await db.query(
      'SELECT id FROM stands WHERE id = ?',
      [stand_id]
    );

    if (stands.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Stand not found'
      });
    }

    // Validate destination
    const trimmedDestination = destination.trim();
    if (trimmedDestination.length < 3 || trimmedDestination.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Destination must be between 3 and 100 characters'
      });
    }

    // Validate fare
    const fareValue = parseFloat(fare);
    if (fareValue < 5 || fareValue > 200) {
      return res.status(400).json({
        success: false,
        message: 'Fare must be between ₹5 and ₹200'
      });
    }

    // Validate travel time
    if (!travel_time.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Travel time required'
      });
    }

    // Insert route
    const [result] = await db.query(
      'INSERT INTO routes (stand_id, destination, fare, travel_time) VALUES (?, ?, ?, ?)',
      [stand_id, trimmedDestination, fareValue, travel_time.trim()]
    );

    // Get created route
    const [routes] = await db.query(
      'SELECT * FROM routes WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      route: {
        id: routes[0].id,
        stand_id: routes[0].stand_id,
        destination: routes[0].destination,
        fare: parseFloat(routes[0].fare),
        travel_time: routes[0].travel_time,
        created_at: routes[0].created_at
      }
    });

  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create route'
    });
  }
};

// PUT /api/routes/:id
// Purpose: Update existing route (protected - requires JWT)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { destination, fare, travel_time } = req.body;

    // Check if route exists
    const [existingRoutes] = await db.query(
      'SELECT * FROM routes WHERE id = ?',
      [id]
    );

    if (existingRoutes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check if at least one field is provided
    if (!destination && !fare && !travel_time) {
      return res.status(400).json({
        success: false,
        message: 'At least one field required'
      });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (destination) {
      const trimmedDestination = destination.trim();
      if (trimmedDestination.length < 3 || trimmedDestination.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Destination must be between 3 and 100 characters'
        });
      }
      updates.push('destination = ?');
      params.push(trimmedDestination);
    }

    if (fare !== undefined) {
      const fareValue = parseFloat(fare);
      if (fareValue < 5 || fareValue > 200) {
        return res.status(400).json({
          success: false,
          message: 'Fare must be between ₹5 and ₹200'
        });
      }
      updates.push('fare = ?');
      params.push(fareValue);
    }

    if (travel_time) {
      if (!travel_time.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Travel time cannot be empty'
        });
      }
      updates.push('travel_time = ?');
      params.push(travel_time.trim());
    }

    // Add id to params
    params.push(id);

    // Execute update
    await db.query(
      `UPDATE routes SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated route
    const [updatedRoutes] = await db.query(
      'SELECT * FROM routes WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Route updated successfully',
      route: {
        id: updatedRoutes[0].id,
        stand_id: updatedRoutes[0].stand_id,
        destination: updatedRoutes[0].destination,
        fare: parseFloat(updatedRoutes[0].fare),
        travel_time: updatedRoutes[0].travel_time,
        updated_at: updatedRoutes[0].updated_at
      }
    });

  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update route'
    });
  }
};

// DELETE /api/routes/:id
// Purpose: Delete single route (protected - requires JWT)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if route exists
    const [routes] = await db.query(
      'SELECT * FROM routes WHERE id = ?',
      [id]
    );

    if (routes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Delete route
    await db.query('DELETE FROM routes WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Route deleted successfully'
    });

  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete route'
    });
  }
};
