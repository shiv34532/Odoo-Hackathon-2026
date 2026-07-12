const { getDb } = require("../database");

/**
 * Check whether a vehicle can be assigned to a trip.
 * @param {number} vehicleId
 * @returns {object} vehicle data
 */
async function checkVehicle(vehicleId) {
    const db = await getDb();

    // Find the vehicle
    const vehicle = await db.get(
        "SELECT * FROM vehicles WHERE id = ?",
        [vehicleId]
    );

    // Rule 1: Vehicle must exist
    if (!vehicle) {
        throw new Error("Vehicle not found.");
    }

    // Rule 2: Vehicle must be available
    if (vehicle.status !== "Available") {
        throw new Error(
            `Vehicle cannot be assigned. Current status: ${vehicle.status}`
        );
    }

    // Return vehicle details if everything is OK
    return vehicle;
}

module.exports = {
    checkVehicle ,
     checkDriver
};

/**
 * Check whether a driver can be assigned to a trip.
 * @param {number} driverId
 * @returns {object} driver data
 */
async function checkDriver(driverId) {
    const db = await getDb();

    const driver = await db.get(
        "SELECT * FROM drivers WHERE id = ?",
        [driverId]
    );

    // Rule 1: Driver must exist
    if (!driver) {
        throw new Error("Driver not found.");
    }

    // Rule 2: Driver must be available
    if (driver.status !== "Available") {
        throw new Error(
            `Driver cannot be assigned. Current status: ${driver.status}`
        );
    }

    // Rule 3: License must not be expired
    const today = new Date();
    const expiryDate = new Date(driver.license_expiry_date);

    if (expiryDate < today) {
        throw new Error("Driver's license has expired.");
    }

    return driver;
}
