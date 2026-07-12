const { spawn } = require('child_process');
const assert = require('assert');
const path = require('path');

// Test Configuration
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api`;
let serverProcess = null;
let authToken = '';

// Helper for HTTP requests
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  options.headers = options.headers || {};
  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }
  if (options.body && typeof options.body === 'object') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// Start local server
function startServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting test server...');
    const serverPath = path.join(__dirname, 'backend', 'server.js');
    serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, PORT: PORT.toString() }
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      // console.log('[Server Output]:', output);
      if (output.includes('TransitOps server running')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[Server Error]:', data.toString());
    });

    serverProcess.on('error', (err) => {
      reject(err);
    });

    // Timeout if server doesn't start in 10s
    setTimeout(() => reject(new Error('Server start timed out')), 10000);
  });
}

// Cleanup and stop server
function stopServer() {
  if (serverProcess) {
    console.log('Stopping test server...');
    serverProcess.kill();
  }
}

// Run tests
async function runTests() {
  try {
    await startServer();
    console.log('\n==================================================');
    console.log('STARTING INTEGRATION TESTS FOR BUSINESS RULES');
    console.log('==================================================\n');

    // 1. Authenticate
    console.log('Test 1: Authenticating Fleet Manager user...');
    const loginRes = await request('/login', {
      method: 'POST',
      body: { email: 'manager@transitops.com', password: 'manager123' }
    });
    assert.strictEqual(loginRes.status, 200, 'Login failed');
    assert.ok(loginRes.data.token, 'Token not returned');
    authToken = loginRes.data.token;
    console.log('✓ Authentication successful.\n');

    // 2. Validate Unique Registration Numbers
    console.log('Test 2: Validating unique registration number constraint...');
    const duplicateVehicleRes = await request('/vehicles', {
      method: 'POST',
      body: {
        registration_number: 'MH-12-AB-5005', // Already seeded in DB
        name_model: 'Duplicate-Van',
        type: 'Van',
        max_load_capacity: 500,
        odometer: 100,
        acquisition_cost: 12000,
        region: 'West'
      }
    });
    assert.strictEqual(duplicateVehicleRes.status, 400, 'Duplicate registration was allowed');
    assert.ok(duplicateVehicleRes.data.error.includes('already exists'), 'Incorrect error message');
    console.log('✓ Duplicate registration successfully blocked.\n');

    // 3. Validate Cargo Capacity Checks
    console.log('Test 3: Checking cargo capacity constraints on trip creation...');
    const overloadTripRes = await request('/trips', {
      method: 'POST',
      body: {
        source: 'Mumbai',
        destination: 'Goa',
        vehicle_id: 1, // Van-05 capacity = 500 kg
        driver_id: 1,
        cargo_weight: 600, // 600 kg > 500 kg limit
        planned_distance: 600,
        revenue: 1500
      }
    });
    assert.strictEqual(overloadTripRes.status, 400, 'Overloaded cargo weight was allowed');
    assert.ok(overloadTripRes.data.error.includes('exceeds vehicle maximum capacity'), 'Incorrect overload error message');
    console.log('✓ Overload cargo trip creation successfully blocked.\n');

    // 4. Validate Expired License Block on Dispatch
    console.log('Test 4: Checking expired license block during dispatch...');
    // Driver id 4 (David) is seeded with an expired license ('2026-01-01')
    // Let's create a valid draft trip first
    const createTripRes = await request('/trips', {
      method: 'POST',
      body: {
        source: 'Mumbai',
        destination: 'Pune',
        vehicle_id: 1, // Van-05
        driver_id: 4, // David (Expired License)
        cargo_weight: 200,
        planned_distance: 150,
        revenue: 800
      }
    });
    assert.strictEqual(createTripRes.status, 201, 'Failed to create draft trip');
    const tripId = createTripRes.data.id;

    // Attempt to dispatch
    const dispatchRes = await request(`/trips/${tripId}/dispatch`, { method: 'PUT' });
    assert.strictEqual(dispatchRes.status, 400, 'Dispatch allowed with an expired license');
    assert.ok(dispatchRes.data.error.includes('license is expired'), 'Incorrect expired license error message');
    console.log('✓ Dispatch block on expired driver license successfully verified.\n');

    // 5. Validate Suspended Driver Block on Dispatch
    console.log('Test 5: Checking suspended driver block during dispatch...');
    // Create trip with driver id 3 (Sam - Suspended)
    const createTripSuspendedRes = await request('/trips', {
      method: 'POST',
      body: {
        source: 'Mumbai',
        destination: 'Pune',
        vehicle_id: 1,
        driver_id: 3, // Sam (Suspended)
        cargo_weight: 200,
        planned_distance: 150,
        revenue: 800
      }
    });
    assert.strictEqual(createTripSuspendedRes.status, 201);
    const suspendedTripId = createTripSuspendedRes.data.id;

    // Attempt to dispatch
    const dispatchSuspendedRes = await request(`/trips/${suspendedTripId}/dispatch`, { method: 'PUT' });
    assert.strictEqual(dispatchSuspendedRes.status, 400, 'Dispatch allowed with a suspended driver');
    assert.ok(dispatchSuspendedRes.data.error.includes('Suspended'), 'Incorrect suspended driver error message');
    console.log('✓ Dispatch block on suspended driver successfully verified.\n');

    // 6. Validate Maintenance Status Changes (In Shop block)
    console.log('Test 6: Checking active maintenance sets vehicle to In Shop and blocks dispatch...');
    // Put vehicle 2 (Truck-01) in maintenance
    const startMaintRes = await request('/maintenance', {
      method: 'POST',
      body: {
        vehicle_id: 2,
        description: 'Battery Check',
        cost: 100,
        start_date: '2026-07-12'
      }
    });
    assert.strictEqual(startMaintRes.status, 201, 'Failed to create maintenance log');

    // Verify vehicle 2 is now 'In Shop'
    const getVehicleRes = await request('/vehicles');
    const veh2 = getVehicleRes.data.find(v => v.id === 2);
    assert.strictEqual(veh2.status, 'In Shop', 'Vehicle status did not transition to In Shop');

    // Try to dispatch a trip with vehicle 2
    const createMaintTripRes = await request('/trips', {
      method: 'POST',
      body: {
        source: 'Delhi',
        destination: 'Noida',
        vehicle_id: 2, // Truck-01 (In Shop)
        driver_id: 1,
        cargo_weight: 200,
        planned_distance: 50,
        revenue: 200
      }
    });
    assert.strictEqual(createMaintTripRes.status, 201);
    const maintTripId = createMaintTripRes.data.id;

    const dispatchMaintRes = await request(`/trips/${maintTripId}/dispatch`, { method: 'PUT' });
    assert.strictEqual(dispatchMaintRes.status, 400, 'Allowed dispatching a vehicle that is In Shop');
    assert.ok(dispatchMaintRes.data.error.includes('In Shop'), 'Incorrect maintenance block message');
    console.log('✓ Maintenance "In Shop" dispatch block successfully verified.\n');

    console.log('==================================================');
    console.log('ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('==================================================');
  } catch (err) {
    console.error('\n❌ TEST RUN ENCOUNTERED AN ERROR:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    stopServer();
  }
}

runTests();
