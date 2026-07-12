const { query, pool } = require('../config/db');

// GET /api/trips
const getTrips = async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT t.*,
        v.registration_number, v.name AS vehicle_name, v.type AS vehicle_type,
        d.name AS driver_name, d.license_number,
        u.name AS created_by_name
      FROM trips t
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      LEFT JOIN users u ON u.id = t.created_by
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { sql += ` AND t.status = $${idx++}`; params.push(status); }
    if (search) {
      sql += ` AND (t.source ILIKE $${idx} OR t.destination ILIKE $${idx} OR v.registration_number ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    sql += ' ORDER BY t.created_at DESC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/trips/:id
const getTripById = async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, v.registration_number, v.name AS vehicle_name, v.type AS vehicle_type, v.max_load_kg,
              d.name AS driver_name, d.license_number, d.license_expiry
       FROM trips t
       LEFT JOIN vehicles v ON v.id = t.vehicle_id
       LEFT JOIN drivers d ON d.id = t.driver_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/trips
const createTrip = async (req, res) => {
  const client = await pool.connect();
  try {
    const { source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, revenue, notes } = req.body;

    if (!source || !destination || !vehicle_id || !driver_id || !cargo_weight_kg || !planned_distance_km) {
      return res.status(400).json({ success: false, message: 'Required fields: source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km.' });
    }

    // Validate vehicle
    const vehicleRes = await client.query('SELECT id, status, max_load_kg FROM vehicles WHERE id = $1', [vehicle_id]);
    if (vehicleRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    const vehicle = vehicleRes.rows[0];
    if (vehicle.status !== 'Available') {
      return res.status(400).json({ success: false, message: `Vehicle is not available. Current status: ${vehicle.status}` });
    }
    if (parseFloat(cargo_weight_kg) > parseFloat(vehicle.max_load_kg)) {
      return res.status(400).json({ success: false, message: `Cargo weight (${cargo_weight_kg} kg) exceeds vehicle max load (${vehicle.max_load_kg} kg).` });
    }

    // Validate driver
    const driverRes = await client.query('SELECT id, status, license_expiry FROM drivers WHERE id = $1', [driver_id]);
    if (driverRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Driver not found.' });
    const driver = driverRes.rows[0];
    if (driver.status !== 'Available') {
      return res.status(400).json({ success: false, message: `Driver is not available. Current status: ${driver.status}` });
    }
    if (new Date(driver.license_expiry) < new Date()) {
      return res.status(400).json({ success: false, message: 'Driver license is expired. Cannot assign to trip.' });
    }

    const result = await client.query(
      `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, revenue, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, revenue || 0, notes || null, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Trip created successfully.', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// POST /api/trips/:id/dispatch
const dispatchTrip = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tripRes = await client.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    if (tripRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }
    const trip = tripRes.rows[0];
    if (trip.status !== 'Draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Trip cannot be dispatched. Current status: ${trip.status}` });
    }

    // Re-validate vehicle and driver availability
    const v = (await client.query('SELECT status FROM vehicles WHERE id = $1', [trip.vehicle_id])).rows[0];
    const d = (await client.query('SELECT status, license_expiry FROM drivers WHERE id = $1', [trip.driver_id])).rows[0];

    if (v.status !== 'Available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Vehicle is no longer available. Status: ${v.status}` });
    }
    if (d.status !== 'Available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Driver is no longer available. Status: ${d.status}` });
    }
    if (new Date(d.license_expiry) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Driver license has expired.' });
    }

    await client.query(`UPDATE trips SET status = 'Dispatched', dispatched_at = NOW(), updated_at = NOW() WHERE id = $1`, [trip.id]);
    await client.query(`UPDATE vehicles SET status = 'On Trip', updated_at = NOW() WHERE id = $1`, [trip.vehicle_id]);
    await client.query(`UPDATE drivers SET status = 'On Trip', updated_at = NOW() WHERE id = $1`, [trip.driver_id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Trip dispatched successfully. Vehicle and Driver are now On Trip.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// POST /api/trips/:id/complete
const completeTrip = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { actual_distance_km, fuel_consumed_l, final_odometer } = req.body;

    const tripRes = await client.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    if (tripRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }
    const trip = tripRes.rows[0];
    if (trip.status !== 'Dispatched') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Trip cannot be completed. Current status: ${trip.status}` });
    }

    await client.query(
      `UPDATE trips SET status = 'Completed', actual_distance_km = $1, fuel_consumed_l = $2, completed_at = NOW(), updated_at = NOW() WHERE id = $3`,
      [actual_distance_km || trip.planned_distance_km, fuel_consumed_l || null, trip.id]
    );
    await client.query(`UPDATE vehicles SET status = 'Available', odometer_km = odometer_km + $1, updated_at = NOW() WHERE id = $2`,
      [actual_distance_km || trip.planned_distance_km, trip.vehicle_id]);
    await client.query(`UPDATE drivers SET status = 'Available', updated_at = NOW() WHERE id = $1`, [trip.driver_id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Trip completed. Vehicle and Driver are now Available.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// POST /api/trips/:id/cancel
const cancelTrip = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tripRes = await client.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    if (tripRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }
    const trip = tripRes.rows[0];
    if (!['Draft', 'Dispatched'].includes(trip.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Trip cannot be cancelled. Current status: ${trip.status}` });
    }

    await client.query(`UPDATE trips SET status = 'Cancelled', updated_at = NOW() WHERE id = $1`, [trip.id]);

    if (trip.status === 'Dispatched') {
      await client.query(`UPDATE vehicles SET status = 'Available', updated_at = NOW() WHERE id = $1`, [trip.vehicle_id]);
      await client.query(`UPDATE drivers SET status = 'Available', updated_at = NOW() WHERE id = $1`, [trip.driver_id]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Trip cancelled. Vehicle and Driver restored to Available.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getTrips, getTripById, createTrip, dispatchTrip, completeTrip, cancelTrip };
