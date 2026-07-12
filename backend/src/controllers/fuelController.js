const { query } = require('../config/db');

// GET /api/fuel
const getFuelLogs = async (req, res) => {
  try {
    const { vehicle_id, trip_id } = req.query;
    let sql = `
      SELECT fl.*, v.registration_number, v.name AS vehicle_name, t.source, t.destination
      FROM fuel_logs fl
      JOIN vehicles v ON v.id = fl.vehicle_id
      LEFT JOIN trips t ON t.id = fl.trip_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (vehicle_id) { sql += ` AND fl.vehicle_id = $${idx++}`; params.push(vehicle_id); }
    if (trip_id) { sql += ` AND fl.trip_id = $${idx++}`; params.push(trip_id); }
    sql += ' ORDER BY fl.date DESC, fl.created_at DESC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/fuel
const createFuelLog = async (req, res) => {
  try {
    const { vehicle_id, trip_id, liters, cost_per_liter, date, odometer_reading } = req.body;

    if (!vehicle_id || !liters || !cost_per_liter) {
      return res.status(400).json({ success: false, message: 'Required fields: vehicle_id, liters, cost_per_liter.' });
    }
    if (liters <= 0 || cost_per_liter <= 0) {
      return res.status(400).json({ success: false, message: 'Liters and cost_per_liter must be positive.' });
    }

    const vehicleCheck = await query('SELECT id FROM vehicles WHERE id = $1', [vehicle_id]);
    if (vehicleCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const result = await query(
      `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost_per_liter, date, odometer_reading)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [vehicle_id, trip_id || null, liters, cost_per_liter, date || new Date().toISOString().split('T')[0], odometer_reading || null]
    );

    res.status(201).json({ success: true, message: 'Fuel log created.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/fuel/:id
const deleteFuelLog = async (req, res) => {
  try {
    const result = await query('DELETE FROM fuel_logs WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Fuel log not found.' });
    res.json({ success: true, message: 'Fuel log deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/expenses
const getExpenses = async (req, res) => {
  try {
    const { vehicle_id, category } = req.query;
    let sql = `
      SELECT e.*, v.registration_number, v.name AS vehicle_name, t.source, t.destination
      FROM expenses e
      JOIN vehicles v ON v.id = e.vehicle_id
      LEFT JOIN trips t ON t.id = e.trip_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (vehicle_id) { sql += ` AND e.vehicle_id = $${idx++}`; params.push(vehicle_id); }
    if (category) { sql += ` AND e.category = $${idx++}`; params.push(category); }
    sql += ' ORDER BY e.date DESC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/expenses
const createExpense = async (req, res) => {
  try {
    const { vehicle_id, trip_id, category, amount, description, date } = req.body;

    if (!vehicle_id || !category || !amount) {
      return res.status(400).json({ success: false, message: 'Required fields: vehicle_id, category, amount.' });
    }

    const validCats = ['Toll', 'Maintenance', 'Fuel', 'Insurance', 'Other'];
    if (!validCats.includes(category)) {
      return res.status(400).json({ success: false, message: `Invalid category. Must be one of: ${validCats.join(', ')}` });
    }

    const result = await query(
      `INSERT INTO expenses (vehicle_id, trip_id, category, amount, description, date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [vehicle_id, trip_id || null, category, amount, description || null, date || new Date().toISOString().split('T')[0]]
    );

    res.status(201).json({ success: true, message: 'Expense recorded.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getFuelLogs, createFuelLog, deleteFuelLog, getExpenses, createExpense };
