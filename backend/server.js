const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { getDb, initDb } = require('./database');
const TripService = require('./services/tripService');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'transitops-secret-key-2026-super-secure';

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Role Validation Middleware
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]` });
    }
    next();
  };
}

// ---------------- AUTH ROUTES ----------------

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields (name, email, password, role) are required' });
  }

  const validRoles = ['Fleet Manager', 'Safety Officer', 'Driver', 'Financial Analyst'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role selection' });
  }

  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await db.run(
      'INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)',
      [name, email, role, passwordHash]
    );

    const newUser = { id: result.lastID, name, email, role };
    const token = jwt.sign(newUser, JWT_SECRET, { expiresIn: '12h' });

    res.status(201).json({ token, user: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ---------------- VEHICLE ROUTES ----------------

app.get('/api/vehicles', authenticateToken, async (req, res) => {
  const { type, status, region } = req.query;
  let query = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (region) {
    query += ' AND region = ?';
    params.push(region);
  }

  try {
    const db = await getDb();
    const vehicles = await db.all(query, params);
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vehicles', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, region } = req.body;

  if (!registration_number || !name_model || !type || !max_load_capacity || !region) {
    return res.status(400).json({ error: 'Missing required vehicle fields' });
  }

  try {
    const db = await getDb();
    // Unique check
    const existing = await db.get('SELECT id FROM vehicles WHERE registration_number = ?', [registration_number]);
    if (existing) {
      return res.status(400).json({ error: 'Vehicle with this registration number already exists.' });
    }

    const result = await db.run(
      `INSERT INTO vehicles (registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, region, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Available')`,
      [registration_number, name_model, type, max_load_capacity, odometer || 0, acquisition_cost || 0, region]
    );

    const newVehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [result.lastID]);
    res.status(201).json(newVehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/vehicles/:id', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  const { registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, region, status } = req.body;

  try {
    const db = await getDb();
    const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [id]);
    if (!vehicle) {
      return res.status(444).json({ error: 'Vehicle not found' });
    }

    // Unique registration number check
    if (registration_number && registration_number !== vehicle.registration_number) {
      const existing = await db.get('SELECT id FROM vehicles WHERE registration_number = ?', [registration_number]);
      if (existing) {
        return res.status(400).json({ error: 'Registration number is already in use by another vehicle.' });
      }
    }

    await db.run(
      `UPDATE vehicles SET registration_number = ?, name_model = ?, type = ?, max_load_capacity = ?, 
       odometer = ?, acquisition_cost = ?, region = ?, status = ? WHERE id = ?`,
      [
        registration_number || vehicle.registration_number,
        name_model || vehicle.name_model,
        type || vehicle.type,
        max_load_capacity !== undefined ? max_load_capacity : vehicle.max_load_capacity,
        odometer !== undefined ? odometer : vehicle.odometer,
        acquisition_cost !== undefined ? acquisition_cost : vehicle.acquisition_cost,
        region || vehicle.region,
        status || vehicle.status,
        id
      ]
    );

    const updated = await db.get('SELECT * FROM vehicles WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/vehicles/:id', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    // Check if assigned to active trips
    const activeTrip = await db.get("SELECT id FROM trips WHERE vehicle_id = ? AND status IN ('Draft', 'Dispatched')", [id]);
    if (activeTrip) {
      return res.status(400).json({ error: 'Cannot delete vehicle. It is currently assigned to an active or pending trip.' });
    }

    await db.run('DELETE FROM vehicles WHERE id = ?', [id]);
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- DRIVER ROUTES ----------------

app.get('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const drivers = await db.all('SELECT * FROM drivers');
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/drivers', authenticateToken, authorizeRoles('Safety Officer', 'Fleet Manager'), async (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score } = req.body;

  if (!name || !license_number || !license_category || !license_expiry_date || !contact_number) {
    return res.status(400).json({ error: 'Missing required driver fields' });
  }

  try {
    const db = await getDb();
    // Unique check
    const existing = await db.get('SELECT id FROM drivers WHERE license_number = ?', [license_number]);
    if (existing) {
      return res.status(400).json({ error: 'Driver with this license number already exists.' });
    }

    const result = await db.run(
      `INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'Available')`,
      [name, license_number, license_category, license_expiry_date, contact_number, safety_score || 100]
    );

    const newDriver = await db.get('SELECT * FROM drivers WHERE id = ?', [result.lastID]);
    res.status(201).json(newDriver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/drivers/:id', authenticateToken, authorizeRoles('Safety Officer', 'Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score, status } = req.body;

  try {
    const db = await getDb();
    const driver = await db.get('SELECT * FROM drivers WHERE id = ?', [id]);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    if (license_number && license_number !== driver.license_number) {
      const existing = await db.get('SELECT id FROM drivers WHERE license_number = ?', [license_number]);
      if (existing) {
        return res.status(400).json({ error: 'License number already in use by another driver.' });
      }
    }

    await db.run(
      `UPDATE drivers SET name = ?, license_number = ?, license_category = ?, license_expiry_date = ?, 
       contact_number = ?, safety_score = ?, status = ? WHERE id = ?`,
      [
        name || driver.name,
        license_number || driver.license_number,
        license_category || driver.license_category,
        license_expiry_date || driver.license_expiry_date,
        contact_number || driver.contact_number,
        safety_score !== undefined ? safety_score : driver.safety_score,
        status || driver.status,
        id
      ]
    );

    const updated = await db.get('SELECT * FROM drivers WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/drivers/:id', authenticateToken, authorizeRoles('Safety Officer', 'Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const activeTrip = await db.get("SELECT id FROM trips WHERE driver_id = ? AND status IN ('Draft', 'Dispatched')", [id]);
    if (activeTrip) {
      return res.status(400).json({ error: 'Cannot delete driver. They are currently assigned to an active or pending trip.' });
    }

    await db.run('DELETE FROM drivers WHERE id = ?', [id]);
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- TRIP ROUTES ----------------

app.get('/api/trips', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    // Join with vehicle and driver details
    const trips = await db.all(`
      SELECT t.*, v.name_model as vehicle_name, v.registration_number as vehicle_reg, 
             d.name as driver_name, d.license_number as driver_license
      FROM trips t
      JOIN vehicles v ON t.vehicle_id = v.id
      JOIN drivers d ON t.driver_id = d.id
      ORDER BY t.id DESC
    `);
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trips', authenticateToken, async (req, res) => {
  const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue } = req.body;

  if (!source || !destination || !vehicle_id || !driver_id || !cargo_weight || !planned_distance) {
    return res.status(400).json({ error: 'Missing required trip fields' });
  }

  try {
    const db = await getDb();
    const tripId = await TripService.createTrip({
      source,
      destination,
      vehicleId: vehicle_id,
      driverId: driver_id,
      cargoWeight: cargo_weight,
      plannedDistance: planned_distance,
      revenue
    });

    const newTrip = await db.get('SELECT * FROM trips WHERE id = ?', [tripId]);
    res.status(201).json(newTrip);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DISPATCH TRIP
app.put('/api/trips/:id/dispatch', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await TripService.dispatchTrip(parseInt(id));
    res.json({ message: 'Trip dispatched successfully. Vehicle and driver status set to On Trip.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// COMPLETE TRIP
app.put('/api/trips/:id/complete', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { final_odometer, fuel_liters, fuel_cost } = req.body;

  if (final_odometer === undefined) {
    return res.status(400).json({ error: 'Final odometer reading is required to complete the trip.' });
  }

  try {
    await TripService.completeTrip(parseInt(id), {
      finalOdometer: final_odometer,
      fuelLiters: fuel_liters || 0,
      fuelCost: fuel_cost || 0
    });
    res.json({ message: 'Trip completed successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// CANCEL TRIP
app.put('/api/trips/:id/cancel', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await TripService.cancelTrip(parseInt(id));
    res.json({ message: 'Trip cancelled successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ---------------- MAINTENANCE ROUTES ----------------

app.get('/api/maintenance', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const logs = await db.all(`
      SELECT m.*, v.name_model as vehicle_name, v.registration_number as vehicle_reg
      FROM maintenance_logs m
      JOIN vehicles v ON m.vehicle_id = v.id
      ORDER BY m.id DESC
    `);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/maintenance', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { vehicle_id, description, cost, start_date, notes } = req.body;

  if (!vehicle_id || !description || !start_date) {
    return res.status(400).json({ error: 'Missing required maintenance fields' });
  }

  try {
    const db = await getDb();
    const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
    if (!vehicle) return res.status(400).json({ error: 'Vehicle not found' });

    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ error: 'Cannot put a vehicle in maintenance while it is on a trip.' });
    }

    await db.run('BEGIN TRANSACTION');
    try {
      // 1. Create Maintenance Log
      const result = await db.run(
        `INSERT INTO maintenance_logs (vehicle_id, description, status, cost, start_date, notes) 
         VALUES (?, ?, 'Active', ?, ?, ?)`,
        [vehicle_id, description, cost || 0, start_date, notes || '']
      );

      // 2. Automatically change vehicle status to In Shop
      await db.run("UPDATE vehicles SET status = 'In Shop' WHERE id = ?", [vehicle_id]);

      await db.run('COMMIT');
      res.status(201).json({ id: result.lastID, message: 'Maintenance record created. Vehicle set to In Shop.' });
    } catch (txErr) {
      await db.run('ROLLBACK');
      throw txErr;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/maintenance/:id/close', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { id } = req.params;
  const { cost, end_date, notes } = req.body;

  const resolvedEndDate = end_date || new Date().toISOString().split('T')[0];

  try {
    const db = await getDb();
    const log = await db.get('SELECT * FROM maintenance_logs WHERE id = ?', [id]);
    if (!log) return res.status(404).json({ error: 'Maintenance record not found' });
    if (log.status === 'Closed') return res.status(400).json({ error: 'Maintenance record is already closed.' });

    const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [log.vehicle_id]);

    await db.run('BEGIN TRANSACTION');
    try {
      // 1. Update Maintenance log to Closed
      const finalCost = cost !== undefined ? cost : log.cost;
      await db.run(
        "UPDATE maintenance_logs SET status = 'Closed', cost = ?, end_date = ?, notes = ? WHERE id = ?",
        [finalCost, resolvedEndDate, notes || log.notes, id]
      );

      // 2. Create an expense record for the maintenance cost
      if (finalCost > 0) {
        await db.run(
          `INSERT INTO expenses (vehicle_id, type, cost, date, description) 
           VALUES (?, 'Maintenance', ?, ?, ?)`,
          [log.vehicle_id, finalCost, resolvedEndDate, `Maintenance: ${log.description}`]
        );
      }

      // 3. Restore vehicle status to Available (unless retired)
      const nextStatus = vehicle.status === 'Retired' ? 'Retired' : 'Available';
      await db.run('UPDATE vehicles SET status = ? WHERE id = ?', [nextStatus, log.vehicle_id]);

      await db.run('COMMIT');
      res.json({ message: 'Maintenance record closed and logged as expense. Vehicle restored to Available.' });
    } catch (txErr) {
      await db.run('ROLLBACK');
      throw txErr;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- FUEL & EXPENSE ROUTES ----------------

app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const fuelLogs = await db.all(`
      SELECT f.*, v.name_model as vehicle_name, v.registration_number as vehicle_reg 
      FROM fuel_logs f 
      JOIN vehicles v ON f.vehicle_id = v.id
      ORDER BY f.date DESC
    `);
    const generalExpenses = await db.all(`
      SELECT e.*, v.name_model as vehicle_name, v.registration_number as vehicle_reg 
      FROM expenses e 
      JOIN vehicles v ON e.vehicle_id = v.id
      ORDER BY e.date DESC
    `);
    res.json({ fuelLogs, generalExpenses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', authenticateToken, async (req, res) => {
  const { vehicle_id, type, cost, date, description } = req.body;

  if (!vehicle_id || !type || !cost || !date) {
    return res.status(400).json({ error: 'Missing required expense fields' });
  }

  try {
    const db = await getDb();
    const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
    if (!vehicle) return res.status(400).json({ error: 'Vehicle not found' });

    await db.run(
      'INSERT INTO expenses (vehicle_id, type, cost, date, description) VALUES (?, ?, ?, ?, ?)',
      [vehicle_id, type, cost, date, description || '']
    );

    res.status(201).json({ message: 'Expense logged successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- REPORT & ANALYTICS ROUTES ----------------

app.get('/api/reports/overview', authenticateToken, async (req, res) => {
  const { type, region, status } = req.query;
  
  try {
    const db = await getDb();

    // Base conditions — if status filter applied, use it; otherwise exclude Retired from total
    let vehWhere      = status ? `WHERE status = '${status.replace(/'/g,"''")}'` : "WHERE status != 'Retired'";
    let activeVehWhere = status ? `WHERE status = '${status.replace(/'/g,"''")}'` : "WHERE status = 'On Trip'";
    let availVehWhere  = status ? `WHERE status = '${status.replace(/'/g,"''")}'` : "WHERE status = 'Available'";
    let maintVehWhere  = status ? `WHERE status = '${status.replace(/'/g,"''")}'` : "WHERE status = 'In Shop'";

    let activeTripsWhere = "WHERE t.status = 'Dispatched'";
    let pendingTripsWhere = "WHERE t.status = 'Draft'";
    let completedTripsWhere = "WHERE t.status = 'Completed'";
    
    const params = [];
    if (type) {
      vehWhere += " AND type = ?";
      activeVehWhere += " AND type = ?";
      availVehWhere += " AND type = ?";
      maintVehWhere += " AND type = ?";
      activeTripsWhere += " AND v.type = ?";
      pendingTripsWhere += " AND v.type = ?";
      completedTripsWhere += " AND v.type = ?";
      params.push(type);
    }
    
    if (region) {
      vehWhere += " AND region = ?";
      activeVehWhere += " AND region = ?";
      availVehWhere += " AND region = ?";
      maintVehWhere += " AND region = ?";
      activeTripsWhere += " AND v.region = ?";
      pendingTripsWhere += " AND v.region = ?";
      completedTripsWhere += " AND v.region = ?";
      params.push(region);
    }

    const activeVehicles = await db.get(`SELECT COUNT(*) as count FROM vehicles ${activeVehWhere}`, params);
    const availableVehicles = await db.get(`SELECT COUNT(*) as count FROM vehicles ${availVehWhere}`, params);
    const maintenanceVehicles = await db.get(`SELECT COUNT(*) as count FROM vehicles ${maintVehWhere}`, params);
    const totalVehicles = await db.get(`SELECT COUNT(*) as count FROM vehicles ${vehWhere}`, params);

    const activeTrips = await db.get(`
      SELECT COUNT(*) as count FROM trips t 
      JOIN vehicles v ON t.vehicle_id = v.id 
      ${activeTripsWhere}`, params);
      
    const pendingTrips = await db.get(`
      SELECT COUNT(*) as count FROM trips t 
      JOIN vehicles v ON t.vehicle_id = v.id 
      ${pendingTripsWhere}`, params);

    // Drivers on duty (filtered by assigned dispatched vehicles type/region if filters are applied)
    let driversQuery = `SELECT COUNT(*) as count FROM drivers WHERE status IN ('Available', 'On Trip')`;
    const driverParams = [];
    if (type || region) {
      driversQuery = `
        SELECT COUNT(DISTINCT d.id) as count FROM drivers d
        LEFT JOIN trips t ON t.driver_id = d.id AND t.status = 'Dispatched'
        LEFT JOIN vehicles v ON t.vehicle_id = v.id
        WHERE d.status IN ('Available', 'On Trip')
      `;
      if (type) {
        driversQuery += " AND (v.type = ? OR v.type IS NULL)";
        driverParams.push(type);
      }
      if (region) {
        driversQuery += " AND (v.region = ? OR v.region IS NULL)";
        driverParams.push(region);
      }
    }
    const driversOnDuty = await db.get(driversQuery, driverParams);

    const utilization = totalVehicles.count > 0 
      ? Math.round((activeVehicles.count / totalVehicles.count) * 100) 
      : 0;

    res.json({
      activeVehicles: activeVehicles.count,
      availableVehicles: availableVehicles.count,
      maintenanceVehicles: maintenanceVehicles.count,
      activeTrips: activeTrips.count,
      pendingTrips: pendingTrips.count,
      driversOnDuty: driversOnDuty.count,
      fleetUtilization: utilization
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/detail', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();

    // Fetch vehicles and sum fuel / maintenance expenses
    const vehicles = await db.all('SELECT * FROM vehicles');
    const reports = [];

    for (const v of vehicles) {
      // Sum fuel costs
      const fuel = await db.get('SELECT SUM(liters) as liters, SUM(cost) as cost FROM fuel_logs WHERE vehicle_id = ?', [v.id]);
      // Sum maintenance & general expenses
      const expense = await db.get('SELECT SUM(cost) as cost FROM expenses WHERE vehicle_id = ?', [v.id]);
      // Sum trip distance & revenue
      const trips = await db.get("SELECT SUM(planned_distance) as distance, SUM(revenue) as revenue FROM trips WHERE vehicle_id = ? AND status = 'Completed'", [v.id]);

      const totalFuelCost = fuel.cost || 0;
      const totalFuelLiters = fuel.liters || 0;
      const totalMaintenanceCost = expense.cost || 0;
      const totalRevenue = trips.revenue || 0;
      const totalDistance = trips.distance || 0;

      const totalOpCost = totalFuelCost + totalMaintenanceCost;
      const fuelEfficiency = totalFuelLiters > 0 ? (totalDistance / totalFuelLiters).toFixed(2) : 0;
      
      const roi = v.acquisition_cost > 0 
        ? ((totalRevenue - totalOpCost) / v.acquisition_cost).toFixed(4)
        : 0;

      reports.push({
        id: v.id,
        registration_number: v.registration_number,
        name_model: v.name_model,
        type: v.type,
        acquisition_cost: v.acquisition_cost,
        odometer: v.odometer,
        totalDistance,
        totalFuelLiters,
        totalFuelCost,
        totalMaintenanceCost,
        totalOpCost,
        totalRevenue,
        fuelEfficiency,
        roi
      });
    }

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CSV Export
app.get('/api/reports/export', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const vehicles = await db.all('SELECT * FROM vehicles');
    
    let csv = 'Registration Number,Model/Name,Type,Odometer (km),Acquisition Cost,Total Distance (km),Total Fuel Cost,Total Maintenance Cost,Total Revenue,Total Op Cost,ROI\n';

    for (const v of vehicles) {
      const fuel = await db.get('SELECT SUM(cost) as cost FROM fuel_logs WHERE vehicle_id = ?', [v.id]);
      const expense = await db.get('SELECT SUM(cost) as cost FROM expenses WHERE vehicle_id = ?', [v.id]);
      const trips = await db.get("SELECT SUM(planned_distance) as distance, SUM(revenue) as revenue FROM trips WHERE vehicle_id = ? AND status = 'Completed'", [v.id]);

      const totalFuel = fuel.cost || 0;
      const totalMaint = expense.cost || 0;
      const totalRev = trips.revenue || 0;
      const totalDist = trips.distance || 0;
      const opCost = totalFuel + totalMaint;
      const roi = v.acquisition_cost > 0 ? ((totalRev - opCost) / v.acquisition_cost).toFixed(4) : 0;

      csv += `"${v.registration_number}","${v.name_model}","${v.type}",${v.odometer},${v.acquisition_cost},${totalDist},${totalFuel},${totalMaint},${totalRev},${opCost},${roi}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transitops_fleet_report.csv');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route to serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Server Initialization
(async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`TransitOps server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database/server:', error);
  }
})();
