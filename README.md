# TransitOps: Smart Transport Operations Platform (Enterprise Edition)

TransitOps is a centralized, end-to-end transport operations platform that digitizes vehicle registration, driver profiles, dispatch routes, maintenance logs, and expense ledgers. It enforces logistics compliance rules, provides real-time ROI reports, and utilizes state-of-the-art interactive aesthetics.

---

## 👥 Target User Personas
* **Fleet Manager**: Manages vehicle inventory, schedules repairs, and tracks asset utilization.
* **Driver**: Creates routes, selects available assets, and logs delivery parameters.
* **Safety Officer**: Evaluates license expirations, compliance indicators, and safety scores.
* **Financial Analyst**: Monitors operational costs, refuel ledgers, and vehicle profit margins.

---

## 📂 Project Directory Structure

```text
Odoo-Hackathon-2026/
├── backend/
│   ├── database.js          # SQLite Schema creation & seed data seeding
│   ├── server.js            # Express API endpoint configurations & auth middlewares
│   ├── tripService.js       # Core business verification rules
│   └── database.sqlite      # Active SQLite database file
├── frontend/
│   ├── assets/              # Isometric vector graphics & illustrations
│   ├── app.js               # SPA controllers, dynamic chart renderings, and API fetches
│   ├── index.html           # Structure layouts, responsive panels, and modal forms
│   └── style.css            # Glassmorphic themes, Ken Burns animations, and responsive CSS
├── test_business_rules.js   # Automated integration test runner (on port 3001)
├── package.json             # Root workspace dependency setups
└── README.md                # Project documentation (this file)
```

---

## 🚀 Beginner-Friendly Getting Started Guide

Follow these simple steps to run the application on your local machine:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 18 or above recommended).

### Step 1: Install Dependencies
Open your terminal in the project directory and run:
```bash
npm install
```

### Step 2: Start the Server
Run the startup script:
```bash
npm start
```
This initializes the SQLite database, seeds default profiles, and starts the web server.
* Main platform: **[http://localhost:3000](http://localhost:3000)**

### Step 3: Run the Integration Tests
To run the automated tests verifying all business constraint rules, execute:
```bash
node test_business_rules.js
```

---

## 🔑 Operator Credentials Cheat Sheet

For easy testing, you can use these default accounts (or click any of the **Quick Test Login** buttons on the login screen):

| Role | Email | Password | Allowed Navigation Tabs |
| :--- | :--- | :--- | :--- |
| **Fleet Manager** | `manager@transitops.com` | `manager123` | Dashboard, Vehicles, Drivers, Maintenance, Expenses, Reports |
| **Driver** | `driver@transitops.com` | `driver123` | Dashboard, Vehicles, Drivers, Expenses |
| **Safety Officer** | `safety@transitops.com` | `safety123` | Dashboard, Vehicles, Drivers, Maintenance |
| **Financial Analyst** | `finance@transitops.com` | `finance123` | Dashboard, Vehicles, Drivers, Expenses, Reports |

---

## 🌟 Interactive UI & Animation Features

* **Glassmorphic Theme**: A modern dark/light translucent panel structure with glowing borders and vibrant vector graphic illustrations.
* **Ken Burns Welcomes**: Dynamic banner panels featuring slow-zoom illustrations (`kenBurnsBackground`) with light-theme filters (`invert(0.95) contrast(1.2)`) to preserve visual text contrast.
* **Shaking Form Validation**: Modals and input forms physically shake (`shakeAlert`) to highlight empty fields or API errors.
* **Active Click Scales**: All button elements scale down slightly on tap (`transform: scale(0.97)`) for haptic confirmation.
* **Sun/Moon Theme Toggles**: Clean icon transition animations that switch themes and redraw charts immediately.
