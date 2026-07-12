const { query } = require('../config/db');

// GET /api/reports/dashboard-kpis
const getDashboardKPIs = async (req, res) => {
  try {
    const [vehicles, trips, drivers, utilization] = await Promise.all([
      query(`
        SELECT
          COUNT(*) AS total_vehicles,
          COUNT(*) FILTER (WHERE status = 'Available') AS available_vehicles,
          COUNT(*) FILTER (WHERE status = 'On Trip') AS on_trip_vehicles,
          COUNT(*) FILTER (WHERE status = 'In Shop') AS in_shop_vehicles,
          COUNT(*) FILTER (WHERE status = 'Retired') AS retired_vehicles
        FROM vehicles
      `),
      query(`
        SELECT
          COUNT(*) AS total_trips,
          COUNT(*) FILTER (WHERE status = 'Dispatched') AS active_trips,
          COUNT(*) FILTER (WHERE status = 'Draft') AS pending_trips,
          COUNT(*) FILTER (WHERE status = 'Completed') AS completed_trips,
          COUNT(*) FILTER (WHERE status = 'Cancelled') AS cancelled_trips,
          COALESCE(SUM(revenue) FILTER (WHERE status = 'Completed'), 0) AS total_revenue
        FROM trips
      `),
      query(`
        SELECT
          COUNT(*) AS total_drivers,
          COUNT(*) FILTER (WHERE status = 'Available') AS available_drivers,
          COUNT(*) FILTER (WHERE status = 'On Trip') AS on_duty_drivers,
          COUNT(*) FILTER (WHERE license_expiry <= CURRENT_DATE + INTERVAL '30 days' AND license_expiry > CURRENT_DATE) AS expiring_soon
        FROM drivers
      `),
      query(`
        SELECT
          CASE WHEN COUNT(*) > 0 
          THEN ROUND((COUNT(*) FILTER (WHERE status = 'On Trip')::numeric / COUNT(*)::numeric * 100), 1)
          ELSE 0 END AS fleet_utilization_pct
        FROM vehicles WHERE status != 'Retired'
      `)
    ]);

    res.json({
      success: true,
      data: {
        vehicles: vehicles.rows[0],
        trips: trips.rows[0],
        drivers: drivers.rows[0],
        fleet_utilization_pct: parseFloat(utilization.rows[0].fleet_utilization_pct),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/fuel-efficiency
const getFuelEfficiency = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        v.id, v.registration_number, v.name, v.type,
        COALESCE(SUM(fl.liters), 0) AS total_liters,
        COALESCE(SUM(fl.total_cost), 0) AS total_fuel_cost,
        COALESCE(SUM(t.actual_distance_km) FILTER (WHERE t.status = 'Completed'), 0) AS total_distance,
        CASE
          WHEN COALESCE(SUM(fl.liters), 0) > 0
          THEN ROUND(COALESCE(SUM(t.actual_distance_km) FILTER (WHERE t.status = 'Completed'), 0) / SUM(fl.liters), 2)
          ELSE 0
        END AS km_per_liter
      FROM vehicles v
      LEFT JOIN fuel_logs fl ON fl.vehicle_id = v.id
      LEFT JOIN trips t ON t.vehicle_id = v.id
      GROUP BY v.id, v.registration_number, v.name, v.type
      ORDER BY km_per_liter DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/operational-cost
const getOperationalCost = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        v.id, v.registration_number, v.name, v.type,
        COALESCE(SUM(fl.total_cost), 0) AS fuel_cost,
        COALESCE(SUM(ml.cost) FILTER (WHERE ml.status = 'Closed'), 0) AS maintenance_cost,
        COALESCE(SUM(e.amount) FILTER (WHERE e.category != 'Fuel'), 0) AS other_expenses,
        COALESCE(SUM(fl.total_cost), 0) + COALESCE(SUM(ml.cost) FILTER (WHERE ml.status = 'Closed'), 0) + COALESCE(SUM(e.amount) FILTER (WHERE e.category != 'Fuel'), 0) AS total_operational_cost
      FROM vehicles v
      LEFT JOIN fuel_logs fl ON fl.vehicle_id = v.id
      LEFT JOIN maintenance_logs ml ON ml.vehicle_id = v.id
      LEFT JOIN expenses e ON e.vehicle_id = v.id
      GROUP BY v.id, v.registration_number, v.name, v.type
      ORDER BY total_operational_cost DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/vehicle-roi
const getVehicleROI = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        v.id, v.registration_number, v.name, v.type, v.acquisition_cost,
        COALESCE(SUM(t.revenue) FILTER (WHERE t.status = 'Completed'), 0) AS total_revenue,
        COALESCE(SUM(fl.total_cost), 0) AS fuel_cost,
        COALESCE(SUM(ml.cost) FILTER (WHERE ml.status = 'Closed'), 0) AS maintenance_cost,
        CASE
          WHEN v.acquisition_cost > 0 THEN
            ROUND(
              (COALESCE(SUM(t.revenue) FILTER (WHERE t.status = 'Completed'), 0) 
               - COALESCE(SUM(fl.total_cost), 0) 
               - COALESCE(SUM(ml.cost) FILTER (WHERE ml.status = 'Closed'), 0))
              / v.acquisition_cost * 100, 2
            )
          ELSE 0
        END AS roi_pct
      FROM vehicles v
      LEFT JOIN trips t ON t.vehicle_id = v.id
      LEFT JOIN fuel_logs fl ON fl.vehicle_id = v.id
      LEFT JOIN maintenance_logs ml ON ml.vehicle_id = v.id
      GROUP BY v.id, v.registration_number, v.name, v.type, v.acquisition_cost
      ORDER BY roi_pct DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/trip-trends
const getTripTrends = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        DATE_TRUNC('month', created_at) AS month_date,
        COUNT(*) AS total_trips,
        COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'Cancelled') AS cancelled,
        COALESCE(SUM(revenue) FILTER (WHERE status = 'Completed'), 0) AS revenue
      FROM trips
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month_date ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getDashboardKPIs, getFuelEfficiency, getOperationalCost, getVehicleROI, getTripTrends };
