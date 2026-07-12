// ==========================================================================
// TRANSITOPS TRIP SERVICE (BUSINESS OPERATIONS LAYER)
// ==========================================================================

const TripService = {
  // 1. checkVehicle
  async checkVehicle(db, vehicleId) {
    const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    if (!vehicle) {
      throw new Error('Invalid Vehicle selected.');
    }
    return vehicle;
  },

  // 2. checkDriver
  async checkDriver(db, driverId) {
    const driver = await db.get('SELECT * FROM drivers WHERE id = ?', [driverId]);
    if (!driver) {
      throw new Error('Invalid Driver selected.');
    }
    return driver;
  },

  // 3. checkCapacity
  checkCapacity(cargoWeight, maxCapacity) {
    if (cargoWeight > maxCapacity) {
      throw new Error(`Cargo weight (${cargoWeight} kg) exceeds vehicle maximum capacity (${maxCapacity} kg).`);
    }
    return true;
  },

  // 4. createTrip
  async createTrip(db, { source, destination, vehicleId, driverId, cargoWeight, plannedDistance, revenue }) {
    const vehicle = await this.checkVehicle(db, vehicleId);
    const driver = await this.checkDriver(db, driverId);

    // Validate capacity
    this.checkCapacity(cargoWeight, vehicle.max_load_capacity);

    const result = await db.run(
      `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft')`,
      [source, destination, vehicleId, driverId, cargoWeight, plannedDistance, revenue || 0]
    );

    return result.lastID;
  },

  // 5. dispatchTrip
  async dispatchTrip(db, tripId) {
    const trip = await db.get('SELECT * FROM trips WHERE id = ?', [tripId]);
    if (!trip) throw new Error('Trip not found');
    if (trip.status !== 'Draft') throw new Error('Only Draft trips can be dispatched.');

    const vehicle = await this.checkVehicle(db, trip.vehicle_id);
    const driver = await this.checkDriver(db, trip.driver_id);

    // Rules checks
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

    // Execute dispatch in transaction
    await db.run('BEGIN TRANSACTION');
    try {
      await db.run("UPDATE trips SET status = 'Dispatched' WHERE id = ?", [tripId]);
      await this.updateVehicleStatus(db, trip.vehicle_id, 'On Trip');
      await this.updateDriverStatus(db, trip.driver_id, 'On Trip');
      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
  },

  // 6. completeTrip
  async completeTrip(db, tripId, { finalOdometer, fuelLiters, fuelCost }) {
    const trip = await db.get('SELECT * FROM trips WHERE id = ?', [tripId]);
    if (!trip) throw new Error('Trip not found');
    if (trip.status !== 'Dispatched') throw new Error('Only Dispatched trips can be completed.');

    const vehicle = await this.checkVehicle(db, trip.vehicle_id);

    if (finalOdometer < vehicle.odometer) {
      throw new Error(`Final odometer (${finalOdometer} km) cannot be less than initial odometer (${vehicle.odometer} km).`);
    }

    const completedTime = new Date().toISOString();

    await db.run('BEGIN TRANSACTION');
    try {
      await db.run("UPDATE trips SET status = 'Completed', completed_at = ? WHERE id = ?", [completedTime, tripId]);
      await this.updateVehicleStatus(db, trip.vehicle_id, 'Available', finalOdometer);
      await this.updateDriverStatus(db, trip.driver_id, 'Available');

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
  },

  // 7. cancelTrip
  async cancelTrip(db, tripId) {
    const trip = await db.get('SELECT * FROM trips WHERE id = ?', [tripId]);
    if (!trip) throw new Error('Trip not found');
    if (trip.status === 'Completed' || trip.status === 'Cancelled') {
      throw new Error(`Cannot cancel a trip that is already ${trip.status}.`);
    }

    await db.run('BEGIN TRANSACTION');
    try {
      await db.run("UPDATE trips SET status = 'Cancelled' WHERE id = ?", [tripId]);
      if (trip.status === 'Dispatched') {
        await this.updateVehicleStatus(db, trip.vehicle_id, 'Available');
        await this.updateDriverStatus(db, trip.driver_id, 'Available');
      }
      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
  },

  // 8. updateVehicleStatus
  async updateVehicleStatus(db, vehicleId, status, odometer = null) {
    if (odometer !== null) {
      await db.run("UPDATE vehicles SET status = ?, odometer = ? WHERE id = ?", [status, odometer, vehicleId]);
    } else {
      await db.run("UPDATE vehicles SET status = ? WHERE id = ?", [status, vehicleId]);
    }
  },

  // 9. updateDriverStatus
  async updateDriverStatus(db, driverId, status) {
    await db.run("UPDATE drivers SET status = ? WHERE id = ?", [status, driverId]);
  }
};

module.exports = TripService;
