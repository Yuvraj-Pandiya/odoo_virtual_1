const { query } = require('../config/db');

// GET /api/vehicles
const getVehicles = async (req, res) => {
  try {
    const { status, type, region, search } = req.query;
    let sql = `
      SELECT v.*, 
        COALESCE(SUM(fl.total_cost), 0) AS total_fuel_cost,
        COALESCE(SUM(ml.cost) FILTER (WHERE ml.status = 'Closed'), 0) AS total_maintenance_cost,
        COALESCE(SUM(fl.liters), 0) AS total_fuel_liters,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'Completed') AS completed_trips
      FROM vehicles v
      LEFT JOIN fuel_logs fl ON fl.vehicle_id = v.id
      LEFT JOIN maintenance_logs ml ON ml.vehicle_id = v.id
      LEFT JOIN trips t ON t.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { sql += ` AND v.status = $${idx++}`; params.push(status); }
    if (type) { sql += ` AND v.type = $${idx++}`; params.push(type); }
    if (region) { sql += ` AND v.region = $${idx++}`; params.push(region); }
    if (search) {
      sql += ` AND (v.registration_number ILIKE $${idx} OR v.name ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    sql += ' GROUP BY v.id ORDER BY v.created_at DESC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/vehicles/available
const getAvailableVehicles = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, registration_number, name, model, type, max_load_kg, odometer_km 
       FROM vehicles 
       WHERE status = 'Available'
       ORDER BY name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/vehicles/:id
const getVehicleById = async (req, res) => {
  try {
    const result = await query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/vehicles
const createVehicle = async (req, res) => {
  try {
    const { registration_number, name, model, type, max_load_kg, odometer_km, acquisition_cost, status, region } = req.body;

    if (!registration_number || !name || !type || !max_load_kg || !acquisition_cost) {
      return res.status(400).json({ success: false, message: 'Required fields: registration_number, name, type, max_load_kg, acquisition_cost.' });
    }

    const validTypes = ['Truck', 'Van', 'Car', 'Motorcycle', 'Bus', 'Trailer'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid vehicle type. Must be one of: ${validTypes.join(', ')}` });
    }

    const existing = await query('SELECT id FROM vehicles WHERE registration_number = $1', [registration_number.toUpperCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Registration number already exists.' });
    }

    const result = await query(
      `INSERT INTO vehicles (registration_number, name, model, type, max_load_kg, odometer_km, acquisition_cost, status, region)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [registration_number.toUpperCase(), name, model || null, type, max_load_kg, odometer_km || 0, acquisition_cost, status || 'Available', region || null]
    );

    res.status(201).json({ success: true, message: 'Vehicle created successfully.', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/vehicles/:id
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, model, type, max_load_kg, odometer_km, acquisition_cost, status, region } = req.body;

    const current = await query('SELECT * FROM vehicles WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const v = current.rows[0];
    const result = await query(
      `UPDATE vehicles SET
        name = $1, model = $2, type = $3, max_load_kg = $4,
        odometer_km = $5, acquisition_cost = $6, status = $7, region = $8,
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [
        name || v.name, model || v.model, type || v.type, max_load_kg || v.max_load_kg,
        odometer_km !== undefined ? odometer_km : v.odometer_km,
        acquisition_cost || v.acquisition_cost, status || v.status, region || v.region,
        id
      ]
    );

    res.json({ success: true, message: 'Vehicle updated.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/vehicles/:id
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await query('SELECT status FROM vehicles WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }
    if (current.rows[0].status === 'On Trip') {
      return res.status(400).json({ success: false, message: 'Cannot delete a vehicle that is On Trip.' });
    }

    await query('DELETE FROM vehicles WHERE id = $1', [id]);
    res.json({ success: true, message: 'Vehicle deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getVehicles, getAvailableVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle };
