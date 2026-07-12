# 🚛 TransitOps: Smart Transport Operations Platform (Enterprise Edition)

> **A modern fleet and transport management platform built to streamline logistics, improve compliance, optimize operational costs, and provide real-time business insights.**

TransitOps is an enterprise-grade transport operations platform designed to help organizations efficiently manage vehicles, drivers, trips, maintenance, expenses, and compliance from a single centralized dashboard.

The platform digitizes the complete transport lifecycle—from vehicle registration and dispatch planning to preventive maintenance, financial reporting, and operational analytics—while providing a fast, responsive, and visually modern user experience.

---

# ✨ Key Features

## 🚚 Fleet Management
- Complete vehicle inventory management
- Vehicle registration and categorization
- Vehicle availability tracking
- Vehicle utilization monitoring
- Fleet lifecycle management

## 👨‍✈️ Driver Management
- Driver profile management
- Driver assignment
- License validity tracking
- Driver availability monitoring
- Driver performance records

## 🛣 Trip & Dispatch Management
- Trip planning
- Route creation
- Vehicle assignment
- Dispatch workflow
- Delivery status tracking

## 🛠 Maintenance Management
- Preventive maintenance scheduling
- Repair history
- Service reminders
- Maintenance logs
- Vehicle health monitoring

## 💰 Expense Management
- Fuel expense tracking
- Repair expenses
- Operational cost analysis
- Expense history
- ROI monitoring

## 📊 Reports & Analytics
- Fleet utilization reports
- Financial reports
- Cost analysis
- Profitability dashboard
- Maintenance analytics
- Compliance reports

## 🛡 Compliance & Safety
- License expiration alerts
- Vehicle compliance monitoring
- Safety score tracking
- Rule-based validations
- Automated business constraints

---

# 👥 User Roles

| Role | Responsibilities |
|------|------------------|
| 🚚 Fleet Manager | Manage fleet, drivers, maintenance, and reports |
| 👨‍✈️ Driver | Manage assigned trips, vehicles, and delivery logs |
| 🛡 Safety Officer | Monitor licenses, compliance, and safety indicators |
| 💹 Financial Analyst | Track expenses, ROI, operational costs, and profitability |

---

# 📁 Project Structure

```text
Odoo-Hackathon-2026/
│
├── backend/
│   ├── database.js
│   ├── server.js
│   ├── tripService.js
│   └── database.sqlite
│
├── frontend/
│   ├── assets/
│   ├── app.js
│   ├── index.html
│   └── style.css
│
├── test_business_rules.js
├── package.json
└── README.md
```

---

# 📂 Folder Description

## Backend

| File | Description |
|------|-------------|
| database.js | Creates SQLite schema and seeds sample data |
| server.js | Express server, REST APIs, middleware, authentication |
| tripService.js | Business logic and validation rules |
| database.sqlite | SQLite database |

## Frontend

| File | Description |
|------|-------------|
| index.html | Application UI |
| style.css | Glassmorphism styling, animations, responsive layout |
| app.js | SPA logic, API integration, charts |
| assets | Images, icons, SVG illustrations |

---

# ⚙ Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript (ES6)

### Backend

- Node.js
- Express.js
- SQLite3

### Testing

- Node.js Integration Tests

---

# 🚀 Getting Started

## Prerequisites

- Node.js (v18+)
- npm

---

## Installation

Clone the repository

```bash
git clone https://github.com/yourusername/Odoo-Hackathon-2026.git
```

Navigate to the project

```bash
cd Odoo-Hackathon-2026
```

Install dependencies

```bash
npm install
```

---

# ▶ Start the Application

```bash
npm start
```

This command will:

- Create the SQLite database
- Seed demo data
- Start the Express server

Open your browser and visit

```
http://localhost:3000
```

---

# 🧪 Run Integration Tests

```bash
node test_business_rules.js
```

The automated tests verify:

- Vehicle assignment rules
- Driver eligibility
- License validation
- Maintenance constraints
- Expense validations
- Business logic integrity

---

# 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Fleet Manager | manager@transitops.com | manager123 |
| Driver | driver@transitops.com | driver123 |
| Safety Officer | safety@transitops.com | safety123 |
| Financial Analyst | finance@transitops.com | finance123 |

---

# 🎨 UI Highlights

## 🌌 Modern Glassmorphism
- Frosted glass cards
- Smooth gradients
- Soft shadows
- Premium dashboard appearance

## 🌗 Dark / Light Theme
- Animated theme switching
- Persistent user preference
- Instant chart updates

## 🎬 Smooth Animations
- Ken Burns background effects
- Hover animations
- Button click effects
- Smooth transitions

## 📊 Interactive Dashboard
- KPI Cards
- Fleet statistics
- Expense charts
- Performance analytics
- Live operational insights

## ⚠ Smart Validation
- Animated form validation
- Shake effect on invalid input
- Business rule enforcement
- User-friendly error messages

---

# 🔒 Business Rules

TransitOps automatically enforces several operational constraints:

- Drivers with expired licenses cannot be assigned trips.
- Vehicles under maintenance cannot be dispatched.
- Duplicate vehicle registrations are prevented.
- Invalid expense records are rejected.
- Maintenance schedules cannot overlap.
- All required information is validated before saving.

---

# 📦 Core Modules

- Dashboard
- Fleet Management
- Driver Management
- Trip Management
- Maintenance
- Expense Management
- Reports & Analytics
- Compliance Monitoring
- Authentication

---

# ⚡ Performance Features

- Single Page Application (SPA)
- Lightweight architecture
- Fast SQLite queries
- Optimized REST APIs
- Responsive design
- Efficient DOM rendering

---

# 🔮 Future Enhancements

- Live GPS Tracking
- AI Route Optimization
- Predictive Maintenance
- Fuel Analytics
- QR Code Vehicle Check-in
- Email Notifications
- Push Notifications
- Multi-Branch Fleet Support
- Cloud Database Integration
- Role-Based Permissions
- Audit Logs
- PDF & Excel Report Export

---

# 🏆 Hackathon Highlights

- Enterprise-grade architecture
- Clean and modular codebase
- Responsive UI
- Modern Glassmorphism design
- Role-based authentication
- Automated business rule validation
- Interactive dashboards
- SQLite-powered backend
- RESTful APIs
- Beginner-friendly project structure

---

# 📄 License

This project was developed for **Odoo Hackathon 2026** and is intended for educational, demonstration, and hackathon purposes only.

---

# 👨‍💻 Developed For

**Odoo Hackathon 2026**

**Project:** TransitOps – Smart Transport Operations Platform (Enterprise Edition)

**Mission:** To build a modern, scalable, secure, and intelligent transport management platform that simplifies fleet operations, ensures compliance, reduces operational costs, and delivers actionable insights through real-time analytics.
