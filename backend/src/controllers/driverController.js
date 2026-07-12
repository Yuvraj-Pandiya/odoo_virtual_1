const { query } = require('../config/db');

// GET /api/drivers
const getDrivers = async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT d.*,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'Completed') AS completed_trips,
        CASE WHEN d.license_expiry < CURRENT_DATE THEN true ELSE false END AS license_expired,
        CASE WHEN d.license_expiry <= CURRENT_DATE + INTERVAL '30 days' AND d.license_expiry > CURRENT_DATE THEN true ELSE false END AS license_expiring_soon
      FROM drivers d
      LEFT JOIN trips t ON t.driver_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { sql += ` AND d.status = $${idx++}`; params.push(status); }
    if (search) {
      sql += ` AND (d.name ILIKE $${idx} OR d.license_number ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    sql += ' GROUP BY d.id ORDER BY d.created_at DESC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/drivers/available
const getAvailableDrivers = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, license_number, license_category, license_expiry, safety_score
       FROM drivers
       WHERE status = 'Available'
         AND license_expiry > CURRENT_DATE
       ORDER BY name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/drivers/:id
const getDriverById = async (req, res) => {
  try {
    const result = await query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/drivers
const createDriver = async (req, res) => {
  try {
    const { name, license_number, license_category, license_expiry, contact, safety_score, status } = req.body;

    if (!name || !license_number || !license_category || !license_expiry) {
      return res.status(400).json({ success: false, message: 'Required fields: name, license_number, license_category, license_expiry.' });
    }

    const existing = await query('SELECT id FROM drivers WHERE license_number = $1', [license_number]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'License number already registered.' });
    }

    const result = await query(
      `INSERT INTO drivers (name, license_number, license_category, license_expiry, contact, safety_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, license_number.toUpperCase(), license_category, license_expiry, contact || null, safety_score || 100, status || 'Available']
    );

    res.status(201).json({ success: true, message: 'Driver created successfully.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/drivers/:id
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, license_number, license_category, license_expiry, contact, safety_score, status } = req.body;

    const current = await query('SELECT * FROM drivers WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }
    const d = current.rows[0];

    const result = await query(
      `UPDATE drivers SET
        name = $1, license_number = $2, license_category = $3, license_expiry = $4,
        contact = $5, safety_score = $6, status = $7, updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [
        name || d.name, license_number || d.license_number, license_category || d.license_category,
        license_expiry || d.license_expiry, contact || d.contact,
        safety_score !== undefined ? safety_score : d.safety_score,
        status || d.status, id
      ]
    );

    res.json({ success: true, message: 'Driver updated.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/drivers/:id
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await query('SELECT status FROM drivers WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }
    if (current.rows[0].status === 'On Trip') {
      return res.status(400).json({ success: false, message: 'Cannot delete a driver that is On Trip.' });
    }
    await query('DELETE FROM drivers WHERE id = $1', [id]);
    res.json({ success: true, message: 'Driver deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getDrivers, getAvailableDrivers, getDriverById, createDriver, updateDriver, deleteDriver };
