const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./backend/database.sqlite');

db.serialize(() => {
  // Clean up duplicate test draft trips (keep only id <= 2)
  db.run("DELETE FROM trips WHERE id > 2 AND status = 'Draft'", function(err) {
    if (err) console.error('Clean trips error:', err.message);
    else console.log('✅ Cleaned', this.changes, 'duplicate draft trips');
  });

  // Fix vehicle status: Truck-01 (id=2) has 5 active maintenance logs - ensure it's In Shop
  db.run("UPDATE vehicles SET status = 'In Shop' WHERE id = 2 AND status != 'On Trip'", function(err) {
    if (err) console.error('Vehicle fix error:', err.message);
    else console.log('✅ Truck-01 status confirmed In Shop');
  });

  // Close duplicate maintenance logs for Truck-01 (keep only the latest one active)
  db.run("UPDATE maintenance_logs SET status = 'Closed', end_date = date('now') WHERE vehicle_id = 2 AND id NOT IN (SELECT MAX(id) FROM maintenance_logs WHERE vehicle_id = 2)", function(err) {
    if (err) console.error('Maintenance dedup error:', err.message);
    else console.log('✅ Closed', this.changes, 'duplicate maintenance logs for Truck-01');
  });

  db.close(() => {
    console.log('✅ Database cleanup complete');
  });
});
