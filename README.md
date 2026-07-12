# Odoo-Hackathon-2026

📋 Business Context

Many logistics companies still rely on spreadsheets and manual logbooks to manage their transport operations. This often leads to:


Scheduling conflicts
Underutilized vehicles
Missed maintenance
Expired driver licenses
Inaccurate expense tracking
Poor operational visibility


TransitOps solves this by centralizing the complete lifecycle of transport operations — from vehicle registration and driver management to dispatching, maintenance, fuel logging, and analytics.

👥 Target Users

RoleResponsibilitiesFleet ManagerOversees fleet assets, maintenance, vehicle lifecycle, and operational efficiencyDriverCreates trips, assigns vehicles and drivers, and monitors active deliveriesSafety OfficerEnsures driver compliance, tracks license validity, and monitors safety scoresFinancial AnalystReviews operational expenses, fuel consumption, maintenance costs, and profitability

✨ Features

🔐 Authentication


Secure login using email and password
Role-Based Access Control (RBAC)
Only authenticated users can access the application


📊 Dashboard


KPIs: Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization (%)
Filters by vehicle type, status, and region


🚚 Vehicle Registry


Master list of vehicles with: Registration Number (unique), Vehicle Name/Model, Type, Maximum Load Capacity, Odometer, Acquisition Cost, and Status
Status values: Available, On Trip, In Shop, Retired


🧑‍✈️ Driver Management


Driver profiles: Name, License Number, License Category, License Expiry Date, Contact Number, Safety Score, and Status
Status values: Available, On Trip, Off Duty, Suspended


🗺️ Trip Management


Create trips by selecting source, destination, available vehicle, available driver, cargo weight, and planned distance
Trip lifecycle: Draft → Dispatched → Completed → Cancelled


🔧 Maintenance


Create maintenance records for vehicles
Adding a vehicle to a maintenance log automatically switches its status to In Shop, removing it from the driver's selection pool


⛽ Fuel & Expense Management


Record fuel logs (liters, cost, date) and other expenses (tolls, maintenance, etc.)
Automatically compute total operational cost (Fuel + Maintenance) per vehicle


📈 Reports & Analytics


Fuel Efficiency (Distance/Fuel)
Fleet Utilization
Operational Cost
Vehicle ROI: (Revenue - (Maintenance + Fuel)) / Acquisition Cost
CSV export (PDF export optional)


⚖️ Mandatory Business Rules


Vehicle registration number must be unique.
Retired or In Shop vehicles must never appear in the dispatch selection.
Drivers with expired licenses or Suspended status cannot be assigned to trips.
A driver or vehicle already marked On Trip cannot be assigned to another trip.
Cargo Weight must not exceed the vehicle's maximum load capacity.
Dispatching a trip automatically changes both the vehicle and driver status to On Trip.
Completing a trip automatically changes both the vehicle and driver status back to Available.
Cancelling a dispatched trip restores the vehicle and driver to Available.
Creating an active maintenance record automatically changes vehicle status to In Shop.
Closing maintenance restores the vehicle to Available (unless retired).


🔄 Example Workflow


Register a vehicle Van-05 with a maximum capacity of 500 kg. Status = Available.
Register driver Alex with a valid driving license.
Create a trip with Cargo Weight = 450 kg.
System validates that 450 kg ≤ 500 kg and allows dispatch.
Vehicle and Driver status automatically become On Trip.
Complete the trip by entering the final odometer and fuel consumed.
System marks both Vehicle and Driver as Available.
Create a maintenance record (e.g., Oil Change) — vehicle status automatically becomes In Shop and is hidden from dispatch.
Reports update operational cost and fuel efficiency based on the latest trip and fuel log.


🗄️ Database Entities


Users
Roles
Vehicles
Drivers
Trips
Maintenance Logs
Fuel Logs
Expenses


✅ Deliverables


 Responsive web interface
 Authentication with RBAC
 CRUD for Vehicles and Drivers
 Trip Management with validations
 Automatic status transitions
 Maintenance workflow
 Fuel & Expense tracking
 Dashboard with KPIs


🌟 Bonus Features


Charts and visual analytics
PDF export
Email reminders for expiring licenses
Vehicle document management
Search, filters, and sorting
Dark mode


🎨 Design Reference

Mockup: Excalidraw link

🚀 Getting Started


Update this section with your actual setup instructions once the tech stack is finalized.



bash# Clone the repository
git clone <your-repo-url>
cd transitops

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Run the application
npm start
