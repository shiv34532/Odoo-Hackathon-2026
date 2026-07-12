const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.sqlite');

async function getDb() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

async function initDb() {
  const db = await getDb();

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON;');

  // Create Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('Fleet Manager', 'Driver', 'Safety Officer', 'Financial Analyst'))
    );
  `);

  // Create Vehicles Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_number TEXT UNIQUE NOT NULL,
      name_model TEXT NOT NULL,
      type TEXT NOT NULL,
      max_load_capacity REAL NOT NULL,
      odometer REAL NOT NULL DEFAULT 0,
      acquisition_cost REAL NOT NULL DEFAULT 0,
      region TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'In Shop', 'Retired'))
    );
  `);

  // Create Drivers Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      license_number TEXT UNIQUE NOT NULL,
      license_category TEXT NOT NULL,
      license_expiry_date TEXT NOT NULL, -- YYYY-MM-DD
      contact_number TEXT NOT NULL,
      safety_score INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'Off Duty', 'Suspended'))
    );
  `);

  // Create Trips Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      cargo_weight REAL NOT NULL,
      planned_distance REAL NOT NULL,
      revenue REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
      FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT
    );
  `);

  // Create Maintenance Logs Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Closed')),
      cost REAL NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT,
      notes TEXT,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );
  `);

  // Create Fuel Logs Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS fuel_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      trip_id INTEGER,
      liters REAL NOT NULL,
      cost REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL
    );
  `);

  // Create Expenses Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('Tolls', 'Maintenance', 'Insurance', 'Other')),
      cost REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );
  `);

  // Seed Users if empty
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    console.log('Seeding initial users...');
    const roles = [
      { name: 'Alice Smith', email: 'manager@transitops.com', role: 'Fleet Manager', pass: 'manager123' },
      { name: 'Alex Driver', email: 'driver@transitops.com', role: 'Driver', pass: 'driver123' },
      { name: 'Sarah Connor', email: 'safety@transitops.com', role: 'Safety Officer', pass: 'safety123' },
      { name: 'Frank Miller', email: 'finance@transitops.com', role: 'Financial Analyst', pass: 'finance123' }
    ];

    for (const r of roles) {
      const hash = bcrypt.hashSync(r.pass, 10);
      await db.run(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [r.name, r.email, hash, r.role]
      );
    }
  }

  // Seed Vehicles if empty
  const vehicleCount = await db.get('SELECT COUNT(*) as count FROM vehicles');
  if (vehicleCount.count === 0) {
    console.log('Seeding initial vehicles...');
    await db.run(`INSERT INTO vehicles (registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, region, status) VALUES 
      ('MH-12-AB-5005', 'Van-05', 'Van', 500, 12000, 15000, 'West', 'Available'),
      ('MH-12-CD-8008', 'Truck-01', 'Truck', 5000, 45000, 55000, 'North', 'Available'),
      ('MH-12-EF-3003', 'Sedan-03', 'Sedan', 350, 8000, 22000, 'South', 'In Shop'),
      ('MH-12-GH-9009', 'Heavy-Truck-X', 'Truck', 10000, 125000, 85000, 'East', 'Retired')
    `);
  }

  // Seed Drivers if empty
  const driverCount = await db.get('SELECT COUNT(*) as count FROM drivers');
  if (driverCount.count === 0) {
    console.log('Seeding initial drivers...');
    await db.run(`INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status) VALUES 
      ('Alex', 'LIC-12345', 'Heavy Vehicle', '2028-06-30', '+91 9876543210', 95, 'Available'),
      ('John', 'LIC-67890', 'Light Vehicle', '2027-12-15', '+91 9876543211', 88, 'Available'),
      ('Sam', 'LIC-11111', 'Light Vehicle', '2025-03-01', '+91 9876543212', 45, 'Suspended'),
      ('David (Expired)', 'LIC-22222', 'Heavy Vehicle', '2026-01-01', '+91 9876543213', 90, 'Available')
    `);
  }

  // Seed Maintenance logs if empty
  const maintCount = await db.get('SELECT COUNT(*) as count FROM maintenance_logs');
  if (maintCount.count === 0) {
    console.log('Seeding maintenance logs...');
    // Sedan-03 (id: 3) is In Shop, let's create active maintenance log
    await db.run(`INSERT INTO maintenance_logs (vehicle_id, description, status, cost, start_date, end_date, notes) VALUES 
      (3, 'Engine Oil and Filter Change', 'Active', 150, '2026-07-10', NULL, 'Needs primary gasket replacement check.'),
      (1, 'Brake pad replacement', 'Closed', 320, '2026-05-12', '2026-05-13', 'Brake pads replaced successfully')
    `);
    // Seed closed maintenance log cost as expense
    await db.run(`INSERT INTO expenses (vehicle_id, type, cost, date, description) VALUES 
      (1, 'Maintenance', 320, '2026-05-13', 'Brake pad replacement service cost')
    `);
  }

  // Seed completed Trip and Fuel Logs for ROI calculation
  const tripCount = await db.get('SELECT COUNT(*) as count FROM trips');
  if (tripCount.count === 0) {
    console.log('Seeding trips & expenses...');
    // Create a Completed trip
    await db.run(`INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue, status, created_at, completed_at) VALUES 
      ('Mumbai', 'Pune', 1, 1, 400, 150, 800, 'Completed', '2026-07-01 08:00:00', '2026-07-01 12:30:00')
    `);

    // Create a Fuel Log for that trip
    await db.run(`INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, date) VALUES 
      (1, 1, 15, 75, '2026-07-01')
    `);

    // Create another Expense (Toll)
    await db.run(`INSERT INTO expenses (vehicle_id, type, cost, date, description) VALUES 
      (1, 'Tolls', 40, '2026-07-01', 'Expressway Toll tax')
    `);

    // Create a Draft trip
    await db.run(`INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue, status) VALUES 
      ('Delhi', 'Jaipur', 2, 2, 4500, 270, 2500, 'Draft')
    `);
  }

  console.log('Database initialized successfully.');
}

module.exports = {
  getDb,
  initDb
};
