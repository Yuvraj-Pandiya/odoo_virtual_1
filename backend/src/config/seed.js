require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, query } = require('./db');

const seed = async () => {
  try {
    // Check if already seeded
    const existing = await query('SELECT COUNT(*) FROM users');
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('⚠️  Database already seeded. Skipping...');
      pool.end();
      return;
    }

    const password = await bcrypt.hash('password123', 12);

    // Seed users
    await query(`
      INSERT INTO users (name, email, password_hash, role) VALUES
      ('Fleet Manager', 'fleet@transitops.com', $1, 'fleet_manager'),
      ('John Driver', 'driver@transitops.com', $1, 'driver'),
      ('Safety Officer', 'safety@transitops.com', $1, 'safety_officer'),
      ('Finance Analyst', 'finance@transitops.com', $1, 'financial_analyst')
    `, [password]);

    // Seed vehicles
    await query(`
      INSERT INTO vehicles (registration_number, name, model, type, max_load_kg, odometer_km, acquisition_cost, status, region) VALUES
      ('TRK-001', 'Titan Hauler', 'Ford F-650', 'Truck', 5000, 12500, 75000, 'Available', 'North'),
      ('VAN-002', 'Swift Cargo', 'Mercedes Sprinter', 'Van', 1200, 8900, 45000, 'Available', 'South'),
      ('TRK-003', 'Iron Horse', 'Volvo FH16', 'Truck', 8000, 34200, 120000, 'In Shop', 'East'),
      ('VAN-004', 'City Runner', 'Ford Transit', 'Van', 900, 21000, 38000, 'Available', 'West'),
      ('TRK-005', 'Mountain Beast', 'Scania R450', 'Truck', 10000, 55000, 150000, 'Available', 'North'),
      ('CAR-006', 'Executive Sedan', 'Toyota Camry', 'Car', 300, 15000, 25000, 'Available', 'South'),
      ('BUS-007', 'Commuter Plus', 'Tata Starbus', 'Bus', 2000, 40000, 85000, 'Retired', 'East')
    `);

    // Seed drivers
    const today = new Date();
    const validExpiry = new Date(today);
    validExpiry.setFullYear(validExpiry.getFullYear() + 2);
    const expiredExpiry = new Date(today);
    expiredExpiry.setMonth(expiredExpiry.getMonth() - 3);

    await query(`
      INSERT INTO drivers (name, license_number, license_category, license_expiry, contact, safety_score, status) VALUES
      ('Alex Johnson', 'DL-2024-001', 'HMV', $1, '+91-9876543210', 95, 'Available'),
      ('Maria Garcia', 'DL-2024-002', 'LMV', $1, '+91-9876543211', 88, 'Available'),
      ('Bob Smith', 'DL-2023-003', 'HMV', $2, '+91-9876543212', 72, 'Off Duty'),
      ('Priya Sharma', 'DL-2024-004', 'HMV', $1, '+91-9876543213', 91, 'Available'),
      ('Carlos Ruiz', 'DL-2024-005', 'LMV', $1, '+91-9876543214', 85, 'Available'),
      ('Tom Wilson', 'DL-2022-006', 'HMV', $2, '+91-9876543215', 60, 'Suspended')
    `, [validExpiry.toISOString().split('T')[0], expiredExpiry.toISOString().split('T')[0]]);

    // Seed a completed trip
    const users = await query('SELECT id FROM users WHERE role = $1', ['fleet_manager']);
    const vehicleId = (await query("SELECT id FROM vehicles WHERE registration_number = 'VAN-002'")).rows[0].id;
    const driverId = (await query("SELECT id FROM drivers WHERE license_number = 'DL-2024-001'")).rows[0].id;

    await query(`
      INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, actual_distance_km, fuel_consumed_l, revenue, status, dispatched_at, completed_at, created_by)
      VALUES ('Mumbai', 'Pune', $1, $2, 800, 150, 148, 18.5, 12000, 'Completed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', $3)
    `, [vehicleId, driverId, users.rows[0].id]);

    // Get the trip id for fuel log
    const trip = await query("SELECT id FROM trips WHERE source = 'Mumbai' LIMIT 1");

    // Seed fuel logs
    await query(`
      INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost_per_liter, date, odometer_reading) VALUES
      ($1, $2, 18.5, 95.50, NOW() - INTERVAL '4 days', 8918),
      ($1, NULL, 40, 94.00, NOW() - INTERVAL '10 days', 8870),
      ((SELECT id FROM vehicles WHERE registration_number = 'TRK-001'), NULL, 65, 93.00, NOW() - INTERVAL '7 days', 12450)
    `, [vehicleId, trip.rows[0].id]);

    // Seed maintenance logs
    const truck3Id = (await query("SELECT id FROM vehicles WHERE registration_number = 'TRK-003'")).rows[0].id;
    await query(`
      INSERT INTO maintenance_logs (vehicle_id, type, description, cost, start_date, status) VALUES
      ($1, 'Engine Overhaul', 'Complete engine overhaul and timing belt replacement', 25000, NOW() - INTERVAL '2 days', 'Active'),
      ((SELECT id FROM vehicles WHERE registration_number = 'TRK-001'), 'Oil Change', 'Routine oil and filter change', 1500, NOW() - INTERVAL '30 days', 'Closed')
    `, [truck3Id]);

    // Seed expenses
    await query(`
      INSERT INTO expenses (vehicle_id, trip_id, category, amount, description, date) VALUES
      ($1, $2, 'Toll', 250, 'Mumbai-Pune expressway toll', NOW() - INTERVAL '4 days'),
      ((SELECT id FROM vehicles WHERE registration_number = 'TRK-001'), NULL, 'Insurance', 45000, 'Annual insurance premium', NOW() - INTERVAL '15 days')
    `, [vehicleId, trip.rows[0].id]);

    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('📧 Demo accounts:');
    console.log('  fleet@transitops.com     | password123 | Fleet Manager');
    console.log('  driver@transitops.com    | password123 | Driver');
    console.log('  safety@transitops.com    | password123 | Safety Officer');
    console.log('  finance@transitops.com   | password123 | Financial Analyst');

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    throw err;
  } finally {
    pool.end();
  }
};

seed().catch(console.error);
