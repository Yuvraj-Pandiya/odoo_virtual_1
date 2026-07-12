const { query, pool } = require('../config/db');

// GET /api/maintenance
const getMaintenanceLogs = async (req, res) => {
  try {
    const { status, vehicle_id } = req.query;
    let sql = `
      SELECT ml.*, v.registration_number, v.name AS vehicle_name, v.type AS vehicle_type
      FROM maintenance_logs ml
      JOIN vehicles v ON v.id = ml.vehicle_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { sql += ` AND ml.status = $${idx++}`; params.push(status); }
    if (vehicle_id) { sql += ` AND ml.vehicle_id = $${idx++}`; params.push(vehicle_id); }
    sql += ' ORDER BY ml.created_at DESC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/maintenance
const createMaintenanceLog = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { vehicle_id, type, description, cost, start_date } = req.body;

    if (!vehicle_id || !type || !start_date) {
      return res.status(400).json({ success: false, message: 'Required fields: vehicle_id, type, start_date.' });
    }

    const vehicleRes = await client.query('SELECT id, status FROM vehicles WHERE id = $1', [vehicle_id]);
    if (vehicleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }
    if (vehicleRes.rows[0].status === 'On Trip') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Vehicle is currently On Trip. Cannot add maintenance record.' });
    }

    const result = await client.query(
      `INSERT INTO maintenance_logs (vehicle_id, type, description, cost, start_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [vehicle_id, type, description || null, cost || 0, start_date]
    );

    // Automatically set vehicle status to In Shop
    await client.query(`UPDATE vehicles SET status = 'In Shop', updated_at = NOW() WHERE id = $1`, [vehicle_id]);

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Maintenance log created. Vehicle status set to In Shop.', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// PUT /api/maintenance/:id
const updateMaintenanceLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description, cost, start_date } = req.body;

    const current = await query('SELECT * FROM maintenance_logs WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Maintenance log not found.' });
    }
    const ml = current.rows[0];

    const result = await query(
      `UPDATE maintenance_logs SET type = $1, description = $2, cost = $3, start_date = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [type || ml.type, description || ml.description, cost !== undefined ? cost : ml.cost, start_date || ml.start_date, id]
    );

    res.json({ success: true, message: 'Maintenance log updated.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/maintenance/:id/close
const closeMaintenanceLog = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { end_date } = req.body;

    const mlRes = await client.query('SELECT * FROM maintenance_logs WHERE id = $1', [req.params.id]);
    if (mlRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Maintenance log not found.' });
    }
    const ml = mlRes.rows[0];
    if (ml.status === 'Closed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Maintenance log is already closed.' });
    }

    await client.query(
      `UPDATE maintenance_logs SET status = 'Closed', end_date = $1, updated_at = NOW() WHERE id = $2`,
      [end_date || new Date().toISOString().split('T')[0], ml.id]
    );

    // Check if vehicle is Retired, if not restore to Available
    const vehicleRes = await client.query('SELECT status FROM vehicles WHERE id = $1', [ml.vehicle_id]);
    if (vehicleRes.rows[0].status !== 'Retired') {
      await client.query(`UPDATE vehicles SET status = 'Available', updated_at = NOW() WHERE id = $1`, [ml.vehicle_id]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Maintenance completed. Vehicle restored to Available.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getMaintenanceLogs, createMaintenanceLog, updateMaintenanceLog, closeMaintenanceLog };
