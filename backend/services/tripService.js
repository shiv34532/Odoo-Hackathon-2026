const { getDb } = require("../database");

/**
 * Check whether a vehicle can be assigned to a trip.
 * @param {number} vehicleId
 * @returns {object} vehicle data
 */
async function checkVehicle(vehicleId) {
    const db = await getDb();
    const vehicle = await db.get("SELECT * FROM vehicles WHERE id = ?", [vehicleId]);
    if (!vehicle) {
        throw new Error("Vehicle not found.");
    }
    if (vehicle.status !== "Available") {
        throw new Error(`Vehicle cannot be assigned. Current status: ${vehicle.status}`);
    }
    return vehicle;
}

/**
 * Check whether a driver can be assigned to a trip.
 * @param {number} driverId
 * @returns {object} driver data
 */
async function checkDriver(driverId) {
    const db = await getDb();
    const driver = await db.get("SELECT * FROM drivers WHERE id = ?", [driverId]);
    if (!driver) {
        throw new Error("Driver not found.");
    }
    if (driver.status !== "Available") {
        throw new Error(`Driver cannot be assigned. Current status: ${driver.status}`);
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (driver.license_expiry_date < todayStr) {
        throw new Error("Driver's license has expired.");
    }
    return driver;
}

/**
 * Check cargo capacity of a vehicle.
 * @param {number} cargoWeight
 * @param {number} maxCapacity
 * @returns {boolean}
 */
function checkCapacity(cargoWeight, maxCapacity) {
    if (cargoWeight > maxCapacity) {
        throw new Error(`Cargo weight (${cargoWeight} kg) exceeds vehicle maximum capacity (${maxCapacity} kg).`);
    }
    return true;
}

/**
 * Create a new Draft Trip record.
 */
async function createTrip({ source, destination, vehicleId, driverId, cargoWeight, plannedDistance, revenue }) {
    const db = await getDb();
    
    // Verify entities exist
    const vehicle = await db.get("SELECT * FROM vehicles WHERE id = ?", [vehicleId]);
    if (!vehicle) {
        throw new Error("Invalid Vehicle selected.");
    }
    const driver = await db.get("SELECT * FROM drivers WHERE id = ?", [driverId]);
    if (!driver) {
        throw new Error("Invalid Driver selected.");
    }

    checkCapacity(cargoWeight, vehicle.max_load_capacity);

    const result = await db.run(
        `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft')`,
        [source, destination, vehicleId, driverId, cargoWeight, plannedDistance, revenue || 0]
    );

    return result.lastID;
}

/**
 * Dispatch a Draft Trip.
 */
async function dispatchTrip(tripId) {
    const db = await getDb();
    const trip = await db.get('SELECT * FROM trips WHERE id = ?', [tripId]);
    if (!trip) throw new Error('Trip not found');
    if (trip.status !== 'Draft') throw new Error('Only Draft trips can be dispatched.');

    const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [trip.vehicle_id]);
    const driver = await db.get('SELECT * FROM drivers WHERE id = ?', [trip.driver_id]);

    // Validation checks
    if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
        throw new Error(`Vehicle is currently ${vehicle.status} and cannot be dispatched.`);
    }
    if (driver.status === 'Suspended') {
        throw new Error('Driver is currently Suspended.');
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (driver.license_expiry_date < todayStr) {
        throw new Error(`Driver license is expired (Expiry: ${driver.license_expiry_date}).`);
    }
    if (vehicle.status === 'On Trip') {
        throw new Error('Vehicle is already assigned to another active trip.');
    }
    if (driver.status === 'On Trip') {
        throw new Error('Driver is already on another active trip.');
    }

    await db.run('BEGIN TRANSACTION');
    try {
        await db.run("UPDATE trips SET status = 'Dispatched' WHERE id = ?", [tripId]);
        await updateVehicleStatus(trip.vehicle_id, 'On Trip');
        await updateDriverStatus(trip.driver_id, 'On Trip');
        await db.run('COMMIT');
    } catch (err) {
        await db.run('ROLLBACK');
        throw err;
    }
}

/**
 * Complete an active Dispatched Trip.
 */
async function completeTrip(tripId, { finalOdometer, fuelLiters, fuelCost }) {
    const db = await getDb();
    const trip = await db.get('SELECT * FROM trips WHERE id = ?', [tripId]);
    if (!trip) throw new Error('Trip not found');
    if (trip.status !== 'Dispatched') throw new Error('Only Dispatched trips can be completed.');

    const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [trip.vehicle_id]);
    if (finalOdometer < vehicle.odometer) {
        throw new Error(`Final odometer (${finalOdometer} km) cannot be less than initial odometer (${vehicle.odometer} km).`);
    }

    const completedTime = new Date().toISOString();

    await db.run('BEGIN TRANSACTION');
    try {
        await db.run("UPDATE trips SET status = 'Completed', completed_at = ? WHERE id = ?", [completedTime, tripId]);
        await updateVehicleStatus(trip.vehicle_id, 'Available', finalOdometer);
        await updateDriverStatus(trip.driver_id, 'Available');

        if (fuelLiters > 0 && fuelCost > 0) {
            await db.run(
                `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, date) 
                 VALUES (?, ?, ?, ?, ?)`,
                [trip.vehicle_id, tripId, fuelLiters, fuelCost, completedTime.split('T')[0]]
            );
        }

        await db.run('COMMIT');
    } catch (err) {
        await db.run('ROLLBACK');
        throw err;
    }
}

/**
 * Cancel a Draft or Dispatched Trip.
 */
async function cancelTrip(tripId) {
    const db = await getDb();
    const trip = await db.get('SELECT * FROM trips WHERE id = ?', [tripId]);
    if (!trip) throw new Error('Trip not found');
    if (trip.status === 'Completed' || trip.status === 'Cancelled') {
        throw new Error(`Cannot cancel a trip that is already ${trip.status}.`);
    }

    await db.run('BEGIN TRANSACTION');
    try {
        await db.run("UPDATE trips SET status = 'Cancelled' WHERE id = ?", [tripId]);
        if (trip.status === 'Dispatched') {
            await updateVehicleStatus(trip.vehicle_id, 'Available');
            await updateDriverStatus(trip.driver_id, 'Available');
        }
        await db.run('COMMIT');
    } catch (err) {
        await db.run('ROLLBACK');
        throw err;
    }
}

/**
 * Update Vehicle Status.
 */
async function updateVehicleStatus(vehicleId, status, odometer = null) {
    const db = await getDb();
    if (odometer !== null) {
        await db.run("UPDATE vehicles SET status = ?, odometer = ? WHERE id = ?", [status, odometer, vehicleId]);
    } else {
        await db.run("UPDATE vehicles SET status = ? WHERE id = ?", [status, vehicleId]);
    }
}

/**
 * Update Driver Status.
 */
async function updateDriverStatus(driverId, status) {
    const db = await getDb();
    await db.run("UPDATE drivers SET status = ? WHERE id = ?", [status, driverId]);
}

module.exports = {
    checkVehicle,
    checkDriver,
    checkCapacity,
    createTrip,
    dispatchTrip,
    completeTrip,
    cancelTrip,
    updateVehicleStatus,
    updateDriverStatus
};
