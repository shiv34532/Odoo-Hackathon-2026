// ==========================================================================
// TRANSITOPS FRONTEND CONTROLLER (ENTERPRISE EDITION)
// ==========================================================================

const API_BASE = '/api';

// Application State
const state = {
  token: localStorage.getItem('transitops_token') || null,
  user: JSON.parse(localStorage.getItem('transitops_user')) || null,
  activeTab: 'dashboard',
  vehicles: [],
  drivers: [],
  trips: [],
  maintenance: [],
  expenses: { fuelLogs: [], generalExpenses: [] },
  reports: []
};

// Global Chart Instance
let fleetChart = null;

// =================---------------- AUTHENTICATION & LOGIN ----------------=================

const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');

// Forms & Cards
const authCardLogin = document.getElementById('auth-card-login');
const authCardRegister = document.getElementById('auth-card-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Fields
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const registerName = document.getElementById('register-name');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const registerRole = document.getElementById('register-role');

// Toggles & Alerts
const linkToRegister = document.getElementById('link-to-register');
const linkToLogin = document.getElementById('link-to-login');
const loginErrorAlert = document.getElementById('login-error-alert');
const registerErrorAlert = document.getElementById('register-error-alert');
const btnLogout = document.getElementById('btn-logout');

// Form Input Shake Error Helper
function shakeElement(element) {
  element.classList.add('shake-error');
  element.addEventListener('animationend', () => {
    element.classList.remove('shake-error');
  }, { once: true });
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function isValidLicenseNumber(value) {
  return /^[A-Za-z0-9-]{6,15}$/.test(value);
}

function isValidContactNumber(value) {
  return /^[0-9]{10}$/.test(value);
}

// Toggle between Login and Register views
linkToRegister.addEventListener('click', (e) => {
  e.preventDefault();
  loginErrorAlert.classList.add('hidden');
  authCardLogin.classList.add('hidden');
  authCardRegister.classList.remove('hidden');
});

linkToLogin.addEventListener('click', (e) => {
  e.preventDefault();
  registerErrorAlert.classList.add('hidden');
  authCardRegister.classList.add('hidden');
  authCardLogin.classList.remove('hidden');
});

// Check Login on Launch
function checkAuth() {
  if (state.token && state.user) {
    loginContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    updateUserUI();
    switchTab(state.activeTab);
  } else {
    loginContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
}

// Handle Login Form Submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginErrorAlert.classList.add('hidden');

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    shakeElement(loginForm);
    loginErrorAlert.textContent = 'Please enter both email and password';
    loginErrorAlert.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    // Save state
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('transitops_token', data.token);
    localStorage.setItem('transitops_user', JSON.stringify(data.user));

    loginContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    updateUserUI();
    showNotification('Access Granted. Workspace loaded.', 'success');
    switchTab('dashboard');
  } catch (err) {
    shakeElement(loginForm);
    loginErrorAlert.textContent = err.message;
    loginErrorAlert.classList.remove('hidden');
  }
});

// Handle Register Form Submit
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerErrorAlert.classList.add('hidden');

  const name = registerName.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;
  const role = registerRole.value;

  if (!name || !email || !password || !role) {
    shakeElement(registerForm);
    registerErrorAlert.textContent = 'All fields are required';
    registerErrorAlert.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    // Save state
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('transitops_token', data.token);
    localStorage.setItem('transitops_user', JSON.stringify(data.user));

    loginContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    updateUserUI();
    showNotification('Account Created. Welcome to TransitOps!', 'success');
    switchTab('dashboard');
  } catch (err) {
    shakeElement(registerForm);
    registerErrorAlert.textContent = err.message;
    registerErrorAlert.classList.remove('hidden');
  }
});

// Quick Login Helper
window.quickLogin = function(role) {
  const credentials = {
    manager: { email: 'manager@transitops.com', pass: 'manager123' },
    safety: { email: 'safety@transitops.com', pass: 'safety123' },
    driver: { email: 'driver@transitops.com', pass: 'driver123' },
    finance: { email: 'finance@transitops.com', pass: 'finance123' }
  };
  const creds = credentials[role];
  if (creds) {
    loginEmail.value = creds.email;
    loginPassword.value = creds.pass;
    loginForm.dispatchEvent(new Event('submit'));
  }
};

// Handle Logout
btnLogout.addEventListener('click', () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem('transitops_token');
  localStorage.removeItem('transitops_user');
  checkAuth();
  showNotification('Console session terminated.', 'success');
});

// Full RBAC Permission Map
const ROLE_PERMISSIONS = {
  'Fleet Manager': {
    tabs: ['dashboard', 'vehicles', 'drivers', 'trips', 'maintenance', 'expenses', 'reports', 'settings'],
    canAddVehicle: true,
    canEditVehicle: true,
    canDeleteVehicle: true,
    canAddDriver: true,
    canEditDriver: true,
    canDeleteDriver: true,
    canCreateTrip: true,
    canDispatchTrip: true,
    canCompleteTrip: true,
    canCancelTrip: true,
    canAddMaintenance: true,
    canCloseMaintenance: true,
    canAddExpense: true,
    canExportReport: true,
    badgeColor: 'badge-info',
    greeting: '🚛 Fleet Operations Console',
    greetingSub: 'Full access — manage vehicles, drivers, dispatch, maintenance and finances'
  },
  'Safety Officer': {
    tabs: ['dashboard', 'vehicles', 'drivers', 'trips', 'maintenance'],
    canAddVehicle: false,
    canEditVehicle: false,
    canDeleteVehicle: false,
    canAddDriver: true,
    canEditDriver: true,
    canDeleteDriver: false,
    canCreateTrip: false,
    canDispatchTrip: false,
    canCompleteTrip: false,
    canCancelTrip: false,
    canAddMaintenance: true,
    canCloseMaintenance: false,
    canAddExpense: false,
    canExportReport: false,
    badgeColor: 'badge-warning',
    greeting: '🛡️ Safety & Compliance Dashboard',
    greetingSub: 'Monitor driver licenses, safety scores, and maintenance compliance'
  },
  'Driver': {
    tabs: ['dashboard', 'vehicles', 'drivers', 'trips'],
    canAddVehicle: false,
    canEditVehicle: false,
    canDeleteVehicle: false,
    canAddDriver: false,
    canEditDriver: false,
    canDeleteDriver: false,
    canCreateTrip: true,
    canDispatchTrip: false,
    canCompleteTrip: false,
    canCancelTrip: false,
    canAddMaintenance: false,
    canCloseMaintenance: false,
    canAddExpense: false,
    canExportReport: false,
    badgeColor: 'badge-success',
    greeting: '🚗 Driver Operations Panel',
    greetingSub: 'View assigned trips, vehicle details, and your current status'
  },
  'Financial Analyst': {
    tabs: ['dashboard', 'vehicles', 'drivers', 'trips', 'expenses', 'reports'],
    canAddVehicle: false,
    canEditVehicle: false,
    canDeleteVehicle: false,
    canAddDriver: false,
    canEditDriver: false,
    canDeleteDriver: false,
    canCreateTrip: false,
    canDispatchTrip: false,
    canCompleteTrip: false,
    canCancelTrip: false,
    canAddMaintenance: false,
    canCloseMaintenance: false,
    canAddExpense: true,
    canExportReport: true,
    badgeColor: 'badge-purple',
    greeting: '📊 Financial Analytics Console',
    greetingSub: 'Track fuel costs, expense ledgers, vehicle ROI and operational budgets'
  }
};

// Update Header/Sidebar with logged-in user profile
function updateUserUI() {
  if (!state.user) return;
  const role = state.user.role;
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['Driver'];

  // Update sidebar profile panel
  document.getElementById('user-display-name').textContent = state.user.name;
  document.getElementById('user-display-role').textContent = role;
  document.getElementById('user-avatar-initial').textContent = state.user.name.charAt(0).toUpperCase();

  // Color-code role badge in sidebar
  const roleEl = document.getElementById('user-display-role');
  roleEl.className = `user-role badge ${perms.badgeColor}`;

  // --- NAV TAB VISIBILITY ---
  const allNavIds = ['nav-vehicles', 'nav-drivers', 'nav-trips', 'nav-maintenance', 'nav-expenses', 'nav-reports'];
  allNavIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const tabName = id.replace('nav-', '');
    if (perms.tabs.includes(tabName)) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  // --- BUTTON-LEVEL ACCESS CONTROL ---
  // Vehicle buttons
  const btnAddVehicle = document.getElementById('btn-add-vehicle');
  if (btnAddVehicle) perms.canAddVehicle ? btnAddVehicle.classList.remove('hidden') : btnAddVehicle.classList.add('hidden');

  // Driver buttons
  const btnAddDriver = document.getElementById('btn-add-driver');
  if (btnAddDriver) perms.canAddDriver ? btnAddDriver.classList.remove('hidden') : btnAddDriver.classList.add('hidden');

  // Trip buttons
  const btnCreateTrip = document.getElementById('btn-create-trip');
  if (btnCreateTrip) perms.canCreateTrip ? btnCreateTrip.classList.remove('hidden') : btnCreateTrip.classList.add('hidden');

  // Maintenance button
  const btnAddMaint = document.getElementById('btn-add-maintenance');
  if (btnAddMaint) perms.canAddMaintenance ? btnAddMaint.classList.remove('hidden') : btnAddMaint.classList.add('hidden');

  // Expense button
  const btnAddExpense = document.getElementById('btn-add-expense');
  if (btnAddExpense) perms.canAddExpense ? btnAddExpense.classList.remove('hidden') : btnAddExpense.classList.add('hidden');

  // CSV Export button
  const btnExport = document.getElementById('btn-csv-export');
  if (btnExport) perms.canExportReport ? btnExport.classList.remove('hidden') : btnExport.classList.add('hidden');

  // Store permissions in state for dynamic table rendering
  state.permissions = perms;

  // Update welcome dashboard greeting based on role
  const welcomeEl = document.getElementById('welcome-message');
  if (welcomeEl) {
    welcomeEl.innerHTML = `Welcome back, <strong>${state.user.name}</strong>! <span class="badge ${perms.badgeColor}" style="font-size:11px; margin-left:6px;">${role}</span>`;
  }
  const welcomeSubEl = document.getElementById('welcome-sub');
  if (welcomeSubEl) {
    welcomeSubEl.textContent = perms.greetingSub;
  }
}

// Guard: prevent direct tab access for unauthorized roles
function canAccessTab(tabName) {
  const perms = state.permissions || ROLE_PERMISSIONS[state.user?.role] || ROLE_PERMISSIONS['Driver'];
  return perms.tabs.includes(tabName);
}


// Authenticated Fetch Helper
async function authFetch(url, options = {}) {
  options.headers = options.headers || {};
  options.headers['Authorization'] = `Bearer ${state.token}`;
  
  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    // Session expired or unauthorized
    state.token = null;
    state.user = null;
    localStorage.removeItem('transitops_token');
    localStorage.removeItem('transitops_user');
    checkAuth();
    throw new Error('Session expired or access forbidden');
  }
  return res;
}

// Global Notification Banners
function showNotification(message, type = 'success') {
  const alertEl = document.getElementById('global-alert');
  alertEl.textContent = message;
  alertEl.className = `alert alert-${type === 'success' ? 'success' : 'danger'}`;
  
  setTimeout(() => {
    alertEl.classList.add('hidden');
  }, 4000);
}

// =================---------------- TAB ROUTING NAVIGATION ----------------=================

const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const tabName = item.getAttribute('data-tab');
    switchTab(tabName);
  });
});

function switchTab(tabName) {
  // Guard: block unauthorized tab access
  if (state.user && !canAccessTab(tabName)) {
    showNotification(`⛔ Access Denied — ${state.user.role} role cannot access this section.`, 'danger');
    return;
  }
  state.activeTab = tabName;

  
  // Set active nav link
  navItems.forEach(nav => {
    if (nav.getAttribute('data-tab') === tabName) {
      nav.classList.add('active');
    } else {
      nav.classList.remove('active');
    }
  });

  // Switch visible panels
  tabPanes.forEach(pane => {
    if (pane.id === `tab-${tabName}`) {
      pane.classList.remove('hidden');
    } else {
      pane.classList.add('hidden');
    }
  });

  // Dynamic header titles
  const titles = {
    dashboard: { title: 'Console Dashboard', desc: 'Real-time parameters, compliance tracking, and asset utilization' },
    vehicles: { title: 'Vehicle Registry', desc: 'Manage registered vehicles and monitor status logs' },
    drivers: { title: 'Driver Management', desc: 'Track driver qualifications, safety scores, and compliance' },
    trips: { title: 'Trips & Dispatch', desc: 'Assign vehicles and drivers to delivery routes' },
    maintenance: { title: 'Maintenance Logs', desc: 'Track inspections, diagnostics, and repairs' },
    expenses: { title: 'Fuel & Expenses', desc: 'Log operational parameters, toll taxes, and costs' },
    reports: { title: 'Reports & Analytics', desc: 'Financial cost summaries, fuel efficiency, and ROI metrics' },
    settings: { title: 'Application Settings', desc: 'Configure depot defaults and role access controls' }
  };

  const headerInfo = titles[tabName] || { title: 'TransitOps', desc: 'Smart Transport Operations Platform' };
  document.getElementById('page-title').textContent = headerInfo.title;
  document.getElementById('page-description').textContent = headerInfo.desc;

  // Load Tab Specific Data
  loadTabData(tabName);
}

function loadTabData(tabName) {
  switch (tabName) {
    case 'dashboard':
      fetchDashboardStats();
      break;
    case 'vehicles':
      fetchVehicles();
      break;
    case 'drivers':
      fetchDrivers();
      break;
    case 'trips':
      fetchTrips();
      break;
    case 'maintenance':
      fetchMaintenanceLogs();
      break;
    case 'expenses':
      fetchExpenses();
      break;
    case 'reports':
      fetchReports();
      break;
    case 'settings':
      loadSettings();
      break;
  }
}

// =================---------------- SETTINGS LOADERS ----------------=================

function loadSettings() {
  const savedSettings = JSON.parse(localStorage.getItem('transitops_settings') || '{}');
  document.getElementById('setting-depot-name').value = savedSettings.depotName || 'Gandhinagar Depot GJT4';
  document.getElementById('setting-currency').value = savedSettings.currency || 'INR (Rs)';
  document.getElementById('setting-distance-unit').value = savedSettings.distanceUnit || 'Kilometers';
}

function saveSettings() {
  const settings = {
    depotName: document.getElementById('setting-depot-name').value.trim(),
    currency: document.getElementById('setting-currency').value.trim(),
    distanceUnit: document.getElementById('setting-distance-unit').value.trim()
  };
  localStorage.setItem('transitops_settings', JSON.stringify(settings));
  showNotification('Settings saved successfully.', 'success');
}

const saveSettingsButton = document.getElementById('btn-save-settings');
if (saveSettingsButton) {
  saveSettingsButton.addEventListener('click', (e) => {
    e.preventDefault();
    saveSettings();
  });
}

// =================---------------- DASHBOARD LOADERS ----------------=================

// Counter animation helper
function animateCounter(elementId, targetVal, isPct = false) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  let start = 0;
  const end = parseInt(targetVal || 0);
  
  if (start === end) {
    el.textContent = end + (isPct ? '%' : '');
    return;
  }
  
  const duration = 700; // ms
  const stepTime = Math.abs(Math.floor(duration / (end || 1)));
  const timer = setInterval(() => {
    start++;
    el.textContent = start + (isPct ? '%' : '');
    if (start >= end) {
      el.textContent = end + (isPct ? '%' : '');
      clearInterval(timer);
    }
  }, Math.max(stepTime, 15));
}

async function fetchDashboardStats() {
  try {
    const type   = document.getElementById('filter-vehicle-type').value;
    const region = document.getElementById('filter-vehicle-region').value;
    const status = document.getElementById('filter-vehicle-status').value;
    
    let url = `${API_BASE}/reports/overview?type=${encodeURIComponent(type)}&region=${encodeURIComponent(region)}&status=${encodeURIComponent(status)}`;
    const res = await authFetch(url);
    const data = await res.json();

    // Welcome message role update
    if (state.user) {
      document.getElementById('welcome-message').innerHTML = `Welcome back, ${state.user.name}! <span style="font-size: 11px; font-weight: 700; vertical-align: middle; margin-left: 8px;" class="badge badge-info">${state.user.role}</span>`;
    }

    // Animate KPI counters
    animateCounter('kpi-active-vehicles', data.activeVehicles);
    animateCounter('kpi-available-vehicles', data.availableVehicles);
    animateCounter('kpi-in-shop-vehicles', data.maintenanceVehicles);
    animateCounter('kpi-active-trips', data.activeTrips);
    animateCounter('kpi-pending-trips', data.pendingTrips);
    animateCounter('kpi-drivers-on-duty', data.driversOnDuty);
    animateCounter('kpi-utilization-pct', data.fleetUtilization, true);

    // Render interactive chart composition
    updateFleetChart(data.availableVehicles, data.activeVehicles, data.maintenanceVehicles);

    // Load safety alerts & operations feed
    loadSafetyAlerts();
    loadOperationsFeed();
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

// Live operations Activity Feed loader
async function loadOperationsFeed() {
  try {
    const resTrips = await authFetch(`${API_BASE}/trips`);
    const trips = await resTrips.json();
    
    const resMaint = await authFetch(`${API_BASE}/maintenance`);
    const maints = await resMaint.json();

    const feedBox = document.getElementById('dashboard-activity-feed');
    if (!feedBox) return;
    feedBox.innerHTML = '';

    const activities = [];

    // Map trips
    trips.forEach(t => {
      if (t.status === 'Completed') {
        activities.push({
          text: `Trip <strong>#${t.id}</strong> (Src: ${t.source}) completed by driver ${t.driver_name}`,
          time: t.completed_at ? new Date(t.completed_at) : new Date(),
          icon: 'bx-check-circle',
          color: 'var(--color-success)'
        });
      } else if (t.status === 'Dispatched') {
        activities.push({
          text: `Trip <strong>#${t.id}</strong> to ${t.destination} has been Dispatched`,
          time: new Date(),
          icon: 'bx-navigation',
          color: 'var(--color-info)'
        });
      } else if (t.status === 'Cancelled') {
        activities.push({
          text: `Trip <strong>#${t.id}</strong> was Cancelled`,
          time: new Date(),
          icon: 'bx-x-circle',
          color: 'var(--color-danger)'
        });
      }
    });

    // Map maintenance
    maints.forEach(m => {
      if (m.status === 'Active') {
        activities.push({
          text: `Vehicle <strong>${m.vehicle_reg}</strong> entered repair shop: "${m.description}"`,
          time: new Date(m.start_date),
          icon: 'bx-wrench',
          color: 'var(--color-warning)'
        });
      } else if (m.status === 'Closed') {
        activities.push({
          text: `Vehicle <strong>${m.vehicle_reg}</strong> maintenance order closed. Expense filed.`,
          time: new Date(m.end_date || m.start_date),
          icon: 'bx-check-square',
          color: 'var(--color-success)'
        });
      }
    });

    // Sort by date (newest first)
    activities.sort((a, b) => b.time - a.time);

    // Render top 5
    const renderList = activities.slice(0, 5);
    if (renderList.length === 0) {
      feedBox.innerHTML = '<div class="alert-item-text">No recent operations logged.</div>';
      return;
    }

    renderList.forEach(act => {
      feedBox.innerHTML += `
        <div class="alert-item" style="border-left: 3px solid ${act.color};">
          <i class="bx ${act.icon} alert-item-icon" style="color:${act.color};"></i>
          <div class="alert-item-text">${act.text}</div>
        </div>
      `;
    });
  } catch (err) {
    console.error('Error loading operations feed:', err);
  }
}

// Chart.js render helper
function updateFleetChart(available, active, inShop) {
  const canvas = document.getElementById('chart-fleet-composition');
  const placeholder = document.getElementById('chart-placeholder-message');
  const total = available + active + inShop;
  const hasData = total > 0;

  // Keep the canvas visible even when filters return no matching data.
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  if (placeholder) {
    placeholder.style.display = hasData ? 'none' : 'flex';
    if (!hasData) {
      placeholder.innerHTML = `
        <i class="bx bx-info-circle" style="font-size: 28px; color: var(--color-primary-glow);"></i>
        <span>No matching fleet data for the selected filters.</span>
      `;
    }
  }

  // Ensure the canvas has layout dimensions before building the chart
  if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
    console.warn('Fleet chart container has zero dimensions; chart may not render properly.');
  }

  // Theme-aware colors matched to the glassmorphic card background
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const textColor    = isLight ? '#0f172a' : '#e2e8f0';
  const tooltipBg    = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(13,17,30,0.95)';
  const chartValues = hasData ? [available, active, inShop] : [1];
  const chartLabels = hasData ? ['Available', 'On Trip', 'In Shop'] : ['No Data'];
  const chartColors = hasData ? ['#10b981', '#8b5cf6', '#f59e0b'] : ['#94a3b8'];
  const chartHoverColors = hasData ? ['#059669', '#7c3aed', '#d97706'] : ['#64748b'];
  const tooltipBorder= isLight ? 'rgba(15,23,42,0.08)'   : 'rgba(99,102,241,0.25)';
  const tooltipText  = isLight ? '#0f172a' : '#f8fafc';
  // Match exactly the card background from CSS variables
  const chartBg      = isLight
    ? 'rgba(255, 255, 255, 0.0)'   // transparent — card handles bg in light mode
    : 'rgba(13, 17, 30, 0.0)';     // transparent — card handles bg in dark mode

  // Destroy previous instance cleanly to prevent glitch/flicker
  if (fleetChart) {
    fleetChart.destroy();
    fleetChart = null;
  }

  // Custom background-color plugin to paint chart canvas bg matching card
  const bgColorPlugin = {
    id: 'chartBgColor',
    beforeDraw(chart) {
      const { ctx: c, chartArea } = chart;
      if (!chartArea) return;
      c.save();
      c.globalCompositeOperation = 'destination-over';
      c.fillStyle = chartBg;
      c.fillRect(0, 0, chart.width, chart.height);
      c.restore();
    }
  };

  // Center label plugin — shows total vehicles count in the donut hole
  const centerLabelPlugin = {
    id: 'centerLabel',
    afterDraw(chart) {
      const { ctx: c, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;
      c.save();
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = textColor;
      c.font = `700 26px Outfit, sans-serif`;
      c.fillText(total, cx, cy - 10);
      c.font = `400 11px Plus Jakarta Sans, sans-serif`;
      c.fillStyle = isLight ? '#64748b' : '#94a3b8';
      c.fillText('Total Vehicles', cx, cy + 12);
      c.restore();
    }
  };

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Unable to get 2D context for fleet chart canvas');
    return;
  }
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded. Confirm the CDN script is available.');
    return;
  }
  fleetChart = new Chart(ctx, {
    type: 'doughnut',
    plugins: [bgColorPlugin, centerLabelPlugin],
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartValues,
        backgroundColor: chartColors,
        hoverBackgroundColor: chartHoverColors,
        borderWidth: 0,
        borderRadius: 6,
        spacing: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateScale: true,
        animateRotate: true,
        duration: 600,
        easing: 'easeInOutQuart'
      },
      plugins: {
        legend: {
          position: 'bottom',
          align: 'center',
          labels: {
            // Force high-contrast readable colors regardless of theme
            color: isLight ? '#1e293b' : '#f1f5f9',
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
            padding: 18,
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 4,
            useBorderRadius: true,
            generateLabels(chart) {
              const ds = chart.data.datasets[0];
              return chart.data.labels.map((label, i) => {
                const val = ds.data[i] || 0;
                const pct = hasData ? Math.round((val / total) * 100) : 100;
                const meta = chart.getDatasetMeta(0);
                return {
                  text: `${label}  ${pct}%`,
                  fillStyle: ds.backgroundColor[i],
                  strokeStyle: 'transparent',
                  lineWidth: 0,
                  fontColor: isLight ? '#1e293b' : '#f1f5f9',
                  hidden: meta.data[i] ? meta.data[i].hidden : false,
                  index: i
                };
              });
            }
          }
        },
        tooltip: {
          // 'average' positions tooltip outside the donut — NOT inside the hole
          position: 'average',
          backgroundColor: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(15,23,42,0.98)',
          borderColor: isLight ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.4)',
          borderWidth: 1,
          // Explicit high-contrast text colors
          titleColor: isLight ? '#0f172a' : '#ffffff',
          bodyColor: isLight ? '#334155' : '#e2e8f0',
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          boxWidth: 10,
          boxHeight: 10,
          callbacks: {
            title(items) {
              return items[0]?.label || '';
            },
            label(context) {
              const val = context.parsed || 0;
              const pct = hasData ? Math.round((val / total) * 100) : 100;
              return `  ${val} vehicles  (${pct}%)`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}

// Apply Filters
document.getElementById('btn-apply-filters').addEventListener('click', () => {
  fetchDashboardStats();
});

// Reset Filters
document.getElementById('btn-reset-filters').addEventListener('click', () => {
  document.getElementById('filter-vehicle-type').value = '';
  document.getElementById('filter-vehicle-status').value = '';
  document.getElementById('filter-vehicle-region').value = '';
  fetchDashboardStats();
  showNotification('Filters cleared.', 'success');
});

async function loadSafetyAlerts() {
  try {
    const resDrivers = await authFetch(`${API_BASE}/drivers`);
    const drivers = await resDrivers.json();
    
    const resVehicles = await authFetch(`${API_BASE}/vehicles`);
    const vehicles = await resVehicles.json();

    const alertsBox = document.getElementById('dashboard-safety-alerts');
    alertsBox.innerHTML = '';

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

    let alertCount = 0;

    // Check Driver Licenses Expiry
    drivers.forEach(d => {
      if (d.license_expiry_date < todayStr) {
        alertCount++;
        alertsBox.innerHTML += `
          <div class="alert-item danger">
            <i class="bx bx-error alert-item-icon"></i>
            <div class="alert-item-text">Driver <strong>${d.name}</strong>'s license is EXPIRED (Expiry: ${d.license_expiry_date}).</div>
          </div>
        `;
      } else if (d.license_expiry_date <= thirtyDaysStr) {
        alertCount++;
        alertsBox.innerHTML += `
          <div class="alert-item warning">
            <i class="bx bx-time-five alert-item-icon"></i>
            <div class="alert-item-text">Driver <strong>${d.name}</strong>'s license expires soon (Expiry: ${d.license_expiry_date}).</div>
          </div>
        `;
      }

      if (d.safety_score < 70) {
        alertCount++;
        alertsBox.innerHTML += `
          <div class="alert-item warning">
            <i class="bx bx-shield-quarter alert-item-icon"></i>
            <div class="alert-item-text">Driver <strong>${d.name}</strong> has a low safety score (${d.safety_score}/100).</div>
          </div>
        `;
      }
    });

    // Check Vehicle Odometers for Maintenance Warning (e.g. over 50,000 km or multiples)
    vehicles.forEach(v => {
      if (v.odometer >= 50000 && v.status === 'Available') {
        alertCount++;
        alertsBox.innerHTML += `
          <div class="alert-item warning">
            <i class="bx bx-wrench alert-item-icon"></i>
            <div class="alert-item-text">Vehicle <strong>${v.registration_number}</strong> (${v.name_model}) odometer exceeds 50k km. Schedule maintenance soon.</div>
          </div>
        `;
      }
    });

    if (alertCount === 0) {
      alertsBox.innerHTML = '<div class="alert-item-text" style="color:var(--color-success);"><i class="bx bx-check-shield"></i> All operations fully compliant! No alerts.</div>';
    }
  } catch (err) {
    console.error('Error listing safety alerts:', err);
  }
}

// =================---------------- VEHICLES MODULE ----------------=================

async function fetchVehicles() {
  try {
    const res = await authFetch(`${API_BASE}/vehicles`);
    state.vehicles = await res.json();
    renderVehicles();
  } catch (err) {
    showNotification('Error loading vehicles: ' + err.message, 'danger');
  }
}

function renderVehicles() {
  const tbody = document.getElementById('tbody-vehicles');
  const searchVal = document.getElementById('search-vehicles').value.toLowerCase();
  
  tbody.innerHTML = '';
  
  const filtered = state.vehicles.filter(v => 
    v.name_model.toLowerCase().includes(searchVal) || 
    v.registration_number.toLowerCase().includes(searchVal)
  );

  filtered.forEach(v => {
    let statusClass = 'badge-success';
    if (v.status === 'On Trip') statusClass = 'badge-info';
    if (v.status === 'In Shop') statusClass = 'badge-warning';
    if (v.status === 'Retired') statusClass = 'badge-danger';

    const managerActions = state.user.role === 'Fleet Manager' ? `
        <a class="btn-row-action edit" onclick="openVehicleModal(${v.id})" title="Edit Vehicle"><i class="bx bx-edit-alt"></i></a>
        <a class="btn-row-action delete" onclick="deleteVehicle(${v.id})" title="Delete Vehicle"><i class="bx bx-trash"></i></a>` : '';

    const actionHtml = `
      <td class="row-actions">
        <a class="btn-row-action" onclick="openDocumentModal(${v.id}, '${v.name_model}')" title="Vehicle Documents" style="color:var(--color-primary);"><i class="bx bx-folder-open"></i></a>
        ${managerActions}
      </td>
    `;


    let iconSrc = 'assets/van.png';
    if (v.type === 'Truck') iconSrc = 'assets/truck.png';
    if (v.type === 'Sedan') iconSrc = 'assets/sedan.png';

    tbody.innerHTML += `
      <tr>
        <td><strong>${v.registration_number}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${iconSrc}" style="width:28px; height:28px; border-radius:4px; object-fit:cover; background:rgba(255,255,255,0.03);" alt="${v.type}">
            <span>${v.name_model}</span>
          </div>
        </td>
        <td>${v.type}</td>
        <td>${v.max_load_capacity} kg</td>
        <td>${v.odometer} km</td>
        <td>${formatCurrency(v.acquisition_cost)}</td>
        <td>${v.region}</td>
        <td><span class="badge ${statusClass}">${v.status}</span></td>
        ${actionHtml}
      </tr>
    `;
  });
}

document.getElementById('search-vehicles').addEventListener('input', renderVehicles);

// Modal Handling
const modalVehicle = document.getElementById('modal-vehicle');
const formVehicle = document.getElementById('form-vehicle');

document.getElementById('btn-add-vehicle').addEventListener('click', () => {
  formVehicle.reset();
  document.getElementById('vehicle-id').value = '';
  document.getElementById('modal-vehicle-title').textContent = 'Add New Vehicle';
  document.getElementById('vehicle-status-group').classList.add('hidden');
  modalVehicle.classList.add('show');
});

async function openVehicleModal(id) {
  const v = state.vehicles.find(item => item.id === id);
  if (!v) return;

  document.getElementById('vehicle-id').value = v.id;
  document.getElementById('vehicle-reg').value = v.registration_number;
  document.getElementById('vehicle-model').value = v.name_model;
  document.getElementById('vehicle-type').value = v.type;
  document.getElementById('vehicle-capacity').value = v.max_load_capacity;
  document.getElementById('vehicle-odometer').value = v.odometer;
  document.getElementById('vehicle-cost').value = v.acquisition_cost;
  document.getElementById('vehicle-region').value = v.region;
  document.getElementById('vehicle-status').value = v.status;

  document.getElementById('modal-vehicle-title').textContent = 'Edit Vehicle';
  document.getElementById('vehicle-status-group').classList.remove('hidden');
  modalVehicle.classList.add('show');
}

formVehicle.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('vehicle-id').value;
  const payload = {
    registration_number: document.getElementById('vehicle-reg').value.trim(),
    name_model: document.getElementById('vehicle-model').value.trim(),
    type: document.getElementById('vehicle-type').value,
    max_load_capacity: parseFloat(document.getElementById('vehicle-capacity').value),
    odometer: parseFloat(document.getElementById('vehicle-odometer').value || 0),
    acquisition_cost: parseFloat(document.getElementById('vehicle-cost').value || 0),
    region: document.getElementById('vehicle-region').value,
    status: id ? document.getElementById('vehicle-status').value : undefined
  };

  try {
    const url = id ? `${API_BASE}/vehicles/${id}` : `${API_BASE}/vehicles`;
    const method = id ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save vehicle');

    modalVehicle.classList.remove('show');
    showNotification(`Vehicle ${payload.name_model} saved successfully!`, 'success');
    fetchVehicles();
  } catch (err) {
    shakeElement(formVehicle);
    showNotification(err.message, 'danger');
  }
});

async function deleteVehicle(id) {
  if (!confirm('Are you sure you want to delete this vehicle?')) return;
  try {
    const res = await authFetch(`${API_BASE}/vehicles/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showNotification('Vehicle deleted successfully.', 'success');
    fetchVehicles();
  } catch (err) {
    showNotification(err.message, 'danger');
  }
}

// =================---------------- DRIVERS MODULE ----------------=================

async function fetchDrivers() {
  try {
    const res = await authFetch(`${API_BASE}/drivers`);
    state.drivers = await res.json();
    renderDrivers();
  } catch (err) {
    showNotification('Error loading drivers: ' + err.message, 'danger');
  }
}

function renderDrivers() {
  const tbody = document.getElementById('tbody-drivers');
  const searchVal = document.getElementById('search-drivers').value.toLowerCase();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const soonThreshold = new Date();
  soonThreshold.setDate(soonThreshold.getDate() + 30);
  const soonStr = soonThreshold.toISOString().split('T')[0];

  tbody.innerHTML = '';
  
  const filtered = state.drivers.filter(d => 
    d.name.toLowerCase().includes(searchVal) || 
    d.license_number.toLowerCase().includes(searchVal)
  );

  filtered.forEach(d => {
    let statusClass = 'badge-success';
    if (d.status === 'On Trip') statusClass = 'badge-info';
    if (d.status === 'Off Duty') statusClass = 'badge-gray';
    if (d.status === 'Suspended') statusClass = 'badge-danger';

    let licenseStatusBadge = '<span class="badge badge-success">Valid</span>';
    if (d.license_expiry_date < todayStr) {
      licenseStatusBadge = '<span class="badge badge-danger">Expired</span>';
    } else if (d.license_expiry_date <= soonStr) {
      licenseStatusBadge = '<span class="badge badge-warning">Expiring Soon</span>';
    }

    const isAuthorized = state.user.role === 'Fleet Manager' || state.user.role === 'Safety Officer';
    const actionHtml = isAuthorized ? `
      <td class="row-actions">
        <a class="btn-row-action edit" onclick="openDriverModal(${d.id})" title="Edit"><i class="bx bx-edit-alt"></i></a>
        <a class="btn-row-action delete" onclick="deleteDriver(${d.id})" title="Delete"><i class="bx bx-trash"></i></a>
      </td>
    ` : '';

    tbody.innerHTML += `
      <tr>
        <td><strong>${d.name}</strong></td>
        <td>${d.license_number}</td>
        <td>${d.license_category}</td>
        <td>${d.license_expiry_date} ${licenseStatusBadge}</td>
        <td>${d.contact_number}</td>
        <td>${d.safety_score}/100</td>
        <td><span class="badge ${statusClass}">${d.status}</span></td>
        ${actionHtml}
      </tr>
    `;
  });
}

document.getElementById('search-drivers').addEventListener('input', renderDrivers);

const modalDriver = document.getElementById('modal-driver');
const formDriver = document.getElementById('form-driver');

document.getElementById('btn-add-driver').addEventListener('click', () => {
  formDriver.reset();
  document.getElementById('driver-id').value = '';
  document.getElementById('modal-driver-title').textContent = 'Add New Driver';
  document.getElementById('driver-status-group').classList.add('hidden');
  modalDriver.classList.add('show');
});

function openDriverModal(id) {
  const d = state.drivers.find(item => item.id === id);
  if (!d) return;

  document.getElementById('driver-id').value = d.id;
  document.getElementById('driver-name').value = d.name;
  document.getElementById('driver-license').value = d.license_number;
  document.getElementById('driver-category').value = d.license_category;
  document.getElementById('driver-expiry').value = d.license_expiry_date;
  document.getElementById('driver-contact').value = d.contact_number;
  document.getElementById('driver-safety').value = d.safety_score;
  document.getElementById('driver-status').value = d.status;

  document.getElementById('modal-driver-title').textContent = 'Edit Driver';
  document.getElementById('driver-status-group').classList.remove('hidden');
  modalDriver.classList.add('show');
}

formDriver.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('driver-id').value;
  const licenseValue = document.getElementById('driver-license').value.trim();
  const contactRaw = document.getElementById('driver-contact').value.trim();
  const contactDigits = contactRaw.replace(/\D/g, '');
  const payload = {
    name: document.getElementById('driver-name').value.trim(),
    license_number: licenseValue,
    license_category: document.getElementById('driver-category').value,
    license_expiry_date: document.getElementById('driver-expiry').value,
    contact_number: contactDigits,
    safety_score: parseInt(document.getElementById('driver-safety').value || 100),
    status: id ? document.getElementById('driver-status').value : undefined
  };

  if (!payload.name || !payload.license_number || !payload.license_category || !payload.license_expiry_date || !payload.contact_number) {
    shakeElement(formDriver);
    showNotification('Please fill all required driver fields.', 'danger');
    return;
  }

  if (!isValidLicenseNumber(payload.license_number)) {
    shakeElement(formDriver);
    showNotification('License number must be 6-15 characters and contain only letters, numbers, or dashes.', 'danger');
    return;
  }

  if (!isValidContactNumber(payload.contact_number)) {
    shakeElement(formDriver);
    showNotification('Contact number must be exactly 10 digits.', 'danger');
    return;
  }

  try {
    const url = id ? `${API_BASE}/drivers/${id}` : `${API_BASE}/drivers`;
    const method = id ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save driver');

    modalDriver.classList.remove('show');
    showNotification(`Driver ${payload.name} saved successfully!`, 'success');
    fetchDrivers();
  } catch (err) {
    shakeElement(formDriver);
    showNotification(err.message, 'danger');
  }
});

async function deleteDriver(id) {
  if (!confirm('Are you sure you want to delete this driver?')) return;
  try {
    const res = await authFetch(`${API_BASE}/drivers/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showNotification('Driver deleted successfully.', 'success');
    fetchDrivers();
  } catch (err) {
    showNotification(err.message, 'danger');
  }
}

// =================---------------- TRIPS & DISPATCH MODULE ----------------=================

async function fetchTrips() {
  try {
    const res = await authFetch(`${API_BASE}/trips`);
    state.trips = await res.json();
    renderTrips();
  } catch (err) {
    showNotification('Error loading trips: ' + err.message, 'danger');
  }
}

function renderTrips() {
  const tbody = document.getElementById('tbody-trips');
  tbody.innerHTML = '';

  state.trips.forEach(t => {
    let statusClass = 'badge-gray';
    if (t.status === 'Dispatched') statusClass = 'badge-info';
    if (t.status === 'Completed') statusClass = 'badge-success';
    if (t.status === 'Cancelled') statusClass = 'badge-danger';

    // Action button logic
    let actionBtn = '';
    if (t.status === 'Draft') {
      actionBtn = `<button class="btn btn-primary btn-sm" onclick="dispatchTrip(${t.id})"><i class="bx bx-navigation"></i> Dispatch</button>`;
    } else if (t.status === 'Dispatched') {
      actionBtn = `
        <div style="display:flex; gap:6px;">
          <button class="btn btn-success btn-sm" onclick="openCompleteTripModal(${t.id})"><i class="bx bx-check-double"></i> Complete</button>
          <button class="btn btn-danger btn-sm" onclick="cancelTrip(${t.id})"><i class="bx bx-x"></i> Cancel</button>
        </div>
      `;
    }

    tbody.innerHTML += `
      <tr>
        <td>#${t.id}</td>
        <td><strong>${t.source} &rarr; ${t.destination}</strong></td>
        <td>${t.vehicle_name} (${t.vehicle_reg})</td>
        <td>${t.driver_name}</td>
        <td>${t.cargo_weight} kg</td>
        <td>${t.planned_distance} km</td>
        <td>${formatCurrency(t.revenue)}</td>
        <td><span class="badge ${statusClass}">${t.status}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  });
}

// Modal handling for creating trips
const modalTrip = document.getElementById('modal-trip');
const formTrip = document.getElementById('form-trip');
const selectTripVehicle = document.getElementById('trip-vehicle');
const selectTripDriver = document.getElementById('trip-driver');

document.getElementById('btn-create-trip').addEventListener('click', async () => {
  formTrip.reset();
  document.getElementById('trip-vehicle-hint').textContent = '';
  document.getElementById('trip-driver-hint').textContent = '';
  
  // Load available vehicles and drivers in dropdown
  try {
    const resVeh = await authFetch(`${API_BASE}/vehicles`);
    const vehicles = await resVeh.json();
    selectTripVehicle.innerHTML = '<option value="">-- Choose Available Vehicle --</option>';
    vehicles.filter(v => v.status === 'Available').forEach(v => {
      selectTripVehicle.innerHTML += `<option value="${v.id}" data-capacity="${v.max_load_capacity}">
        ${v.name_model} (${v.registration_number}) - Capacity: ${v.max_load_capacity} kg
      </option>`;
    });

    const resDri = await authFetch(`${API_BASE}/drivers`);
    const drivers = await resDri.json();
    selectTripDriver.innerHTML = '<option value="">-- Choose Available Driver --</option>';
    
    const todayStr = new Date().toISOString().split('T')[0];
    drivers.filter(d => d.status === 'Available' && d.license_expiry_date >= todayStr).forEach(d => {
      selectTripDriver.innerHTML += `<option value="${d.id}">
        ${d.name} (${d.license_category}) - Score: ${d.safety_score}
      </option>`;
    });

    modalTrip.classList.add('show');
  } catch (err) {
    showNotification(err.message, 'danger');
  }
});

// Update capacity hint client side
selectTripVehicle.addEventListener('change', () => {
  const selected = selectTripVehicle.options[selectTripVehicle.selectedIndex];
  const cap = selected.getAttribute('data-capacity');
  document.getElementById('trip-vehicle-hint').textContent = cap ? `Max Payload: ${cap} kg` : '';
});

formTrip.addEventListener('submit', async (e) => {
  e.preventDefault();
  const vehicleId = parseInt(selectTripVehicle.value);
  const driverId = parseInt(selectTripDriver.value);
  const cargoWeight = parseFloat(document.getElementById('trip-cargo').value);
  const plannedDistance = parseFloat(document.getElementById('trip-distance').value);
  const revenue = parseFloat(document.getElementById('trip-revenue').value);

  // Client side validation of cargo weight limit
  const selectedVeh = selectTripVehicle.options[selectTripVehicle.selectedIndex];
  const maxCap = parseFloat(selectedVeh.getAttribute('data-capacity'));
  if (cargoWeight > maxCap) {
    shakeElement(formTrip);
    showNotification(`Error: Cargo Weight exceeds vehicle's max capacity (${maxCap} kg)`, 'danger');
    return;
  }

  const payload = {
    source: document.getElementById('trip-src').value.trim(),
    destination: document.getElementById('trip-dest').value.trim(),
    vehicle_id: vehicleId,
    driver_id: driverId,
    cargo_weight: cargoWeight,
    planned_distance: plannedDistance,
    revenue: revenue
  };

  try {
    const res = await authFetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    modalTrip.classList.remove('show');
    showNotification('Draft trip created successfully.', 'success');
    fetchTrips();
  } catch (err) {
    shakeElement(formTrip);
    showNotification(err.message, 'danger');
  }
});

async function dispatchTrip(id) {
  try {
    const res = await authFetch(`${API_BASE}/trips/${id}/dispatch`, { method: 'PUT' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showNotification(data.message || 'Trip dispatched!', 'success');
    fetchTrips();
  } catch (err) {
    showNotification('Dispatch failed: ' + err.message, 'danger');
  }
}

// Complete Trip Modal Handle
const modalTripComplete = document.getElementById('modal-trip-complete');
const formTripComplete = document.getElementById('form-trip-complete');

async function openCompleteTripModal(tripId) {
  formTripComplete.reset();
  document.getElementById('complete-trip-id').value = tripId;

  // Retrieve current vehicle odometer for the selected trip
  const trip = state.trips.find(t => t.id === tripId);
  if (!trip) return;

  try {
    const res = await authFetch(`${API_BASE}/vehicles`);
    const vehicles = await res.json();
    const v = vehicles.find(item => item.id === trip.vehicle_id);

    document.getElementById('complete-odometer-hint').textContent = `Initial odometer reading: ${v.odometer} km.`;
    document.getElementById('complete-odometer').value = Math.round(v.odometer + trip.planned_distance); // Autofill estimate
    document.getElementById('complete-odometer').min = v.odometer;

    modalTripComplete.classList.add('show');
  } catch (err) {
    showNotification(err.message, 'danger');
  }
}

formTripComplete.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('complete-trip-id').value;
  const payload = {
    final_odometer: parseFloat(document.getElementById('complete-odometer').value),
    fuel_liters: parseFloat(document.getElementById('complete-fuel-liters').value || 0),
    fuel_cost: parseFloat(document.getElementById('complete-fuel-cost').value || 0)
  };

  try {
    const res = await authFetch(`${API_BASE}/trips/${id}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    modalTripComplete.classList.remove('show');
    showNotification('Trip completed successfully. Resources released.', 'success');
    fetchTrips();
  } catch (err) {
    showNotification(err.message, 'danger');
  }
});

async function cancelTrip(id) {
  if (!confirm('Are you sure you want to cancel this trip?')) return;
  try {
    const res = await authFetch(`${API_BASE}/trips/${id}/cancel`, { method: 'PUT' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showNotification('Trip cancelled.', 'success');
    fetchTrips();
  } catch (err) {
    showNotification(err.message, 'danger');
  }
}

// =================---------------- MAINTENANCE MODULE ----------------=================

async function fetchMaintenanceLogs() {
  try {
    const res = await authFetch(`${API_BASE}/maintenance`);
    state.maintenance = await res.json();
    renderMaintenanceLogs();
  } catch (err) {
    showNotification('Error loading maintenance logs: ' + err.message, 'danger');
  }
}

function renderMaintenanceLogs() {
  const tbody = document.getElementById('tbody-maintenance');
  tbody.innerHTML = '';

  state.maintenance.forEach(log => {
    const badgeClass = log.status === 'Active' ? 'badge-warning' : 'badge-success';
    const closeBtn = log.status === 'Active' && state.user.role === 'Fleet Manager'
      ? `<button class="btn btn-secondary btn-sm" onclick="closeMaintenance(${log.id})"><i class="bx bx-check"></i> Close</button>`
      : '';

    tbody.innerHTML += `
      <tr>
        <td><strong>${log.vehicle_name} (${log.vehicle_reg})</strong></td>
        <td>${log.description}</td>
        <td>${log.start_date}</td>
        <td>${log.end_date || '<i>Under repair...</i>'}</td>
        <td>${formatCurrency(log.cost)}</td>
        <td><span class="badge ${badgeClass}">${log.status}</span></td>
        <td>${closeBtn}</td>
      </tr>
    `;
  });
}

// Create Maintenance Log Modal
const modalMaint = document.getElementById('modal-maintenance');
const formMaint = document.getElementById('form-maintenance');
const selectMaintVehicle = document.getElementById('maint-vehicle');

document.getElementById('btn-add-maintenance').addEventListener('click', async () => {
  formMaint.reset();
  document.getElementById('maint-start').value = new Date().toISOString().split('T')[0];

  try {
    const res = await authFetch(`${API_BASE}/vehicles`);
    const vehicles = await res.json();
    selectMaintVehicle.innerHTML = '<option value="">-- Select Vehicle --</option>';
    // Only Available vehicles can go to maintenance
    vehicles.filter(v => v.status === 'Available').forEach(v => {
      selectMaintVehicle.innerHTML += `<option value="${v.id}">${v.name_model} (${v.registration_number})</option>`;
    });

    modalMaint.classList.add('show');
  } catch (err) {
    showNotification(err.message, 'danger');
  }
});

formMaint.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    vehicle_id: parseInt(selectMaintVehicle.value),
    description: document.getElementById('maint-desc').value.trim(),
    cost: parseFloat(document.getElementById('maint-cost').value || 0),
    start_date: document.getElementById('maint-start').value,
    notes: document.getElementById('maint-notes').value.trim()
  };

  try {
    const res = await authFetch(`${API_BASE}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    modalMaint.classList.remove('show');
    showNotification('Maintenance log registered. Vehicle status updated to In Shop.', 'success');
    fetchMaintenanceLogs();
  } catch (err) {
    showNotification(err.message, 'danger');
  }
});

async function closeMaintenance(id) {
  const finalCostStr = prompt('Enter final service cost (₹):', '150');
  if (finalCostStr === null) return; // Cancelled prompt
  const finalCost = parseFloat(finalCostStr.replace(/[^0-9.]/g, '') || 0);

  try {
    const res = await authFetch(`${API_BASE}/maintenance/${id}/close`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost: finalCost })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showNotification('Service log closed and filed as expense.', 'success');
    fetchMaintenanceLogs();
  } catch (err) {
    showNotification(err.message, 'danger');
  }
}

// =================---------------- FUEL & EXPENSES MODULE ----------------=================

async function fetchExpenses() {
  try {
    const res = await authFetch(`${API_BASE}/expenses`);
    state.expenses = await res.json();
    renderExpenses();
  } catch (err) {
    showNotification('Error loading expenses: ' + err.message, 'danger');
  }
}

function renderExpenses() {
  const tbodyFuel = document.getElementById('tbody-fuel-logs');
  tbodyFuel.innerHTML = '';
  state.expenses.fuelLogs.forEach(f => {
    tbodyFuel.innerHTML += `
      <tr>
        <td><strong>${f.vehicle_name} (${f.vehicle_reg})</strong></td>
        <td>${f.date}</td>
        <td>${f.liters} L</td>
        <td>${formatCurrency(f.cost)}</td>
      </tr>
    `;
  });

  const tbodyExp = document.getElementById('tbody-expenses');
  tbodyExp.innerHTML = '';
  state.expenses.generalExpenses.forEach(e => {
    tbodyExp.innerHTML += `
      <tr>
        <td><strong>${e.vehicle_name} (${e.vehicle_reg})</strong></td>
        <td><span class="badge badge-warning">${e.type}</span></td>
        <td>${formatCurrency(e.cost)}</td>
        <td>${e.date}</td>
        <td>${e.description}</td>
      </tr>
    `;
  });
}

const modalExpense = document.getElementById('modal-expense');
const formExpense = document.getElementById('form-expense');
const selectExpenseVehicle = document.getElementById('expense-vehicle');

document.getElementById('btn-add-expense').addEventListener('click', async () => {
  formExpense.reset();
  document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];

  try {
    const res = await authFetch(`${API_BASE}/vehicles`);
    const vehicles = await res.json();
    selectExpenseVehicle.innerHTML = '<option value="">-- Choose Vehicle --</option>';
    vehicles.forEach(v => {
      selectExpenseVehicle.innerHTML += `<option value="${v.id}">${v.name_model} (${v.registration_number})</option>`;
    });
    modalExpense.classList.add('show');
  } catch (err) {
    showNotification(err.message, 'danger');
  }
});

formExpense.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    vehicle_id: parseInt(selectExpenseVehicle.value),
    type: document.getElementById('expense-type').value,
    cost: parseFloat(document.getElementById('expense-cost').value),
    date: document.getElementById('expense-date').value,
    description: document.getElementById('expense-desc').value.trim()
  };

  try {
    const res = await authFetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    modalExpense.classList.remove('show');
    showNotification('Expense recorded.', 'success');
    fetchExpenses();
  } catch (err) {
    shakeElement(formExpense);
    showNotification(err.message, 'danger');
  }
});

// =================---------------- REPORTS & ANALYTICS MODULE ----------------=================

async function fetchReports() {
  try {
    const res = await authFetch(`${API_BASE}/reports/detail`);
    state.reports = await res.json();
    renderReports();
  } catch (err) {
    showNotification('Error loading reports: ' + err.message, 'danger');
  }
}

function renderReports() {
  const tbody = document.getElementById('tbody-reports');
  tbody.innerHTML = '';

  if (!state.reports || state.reports.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-sub); padding:32px;">No vehicle data available for reports.</td></tr>';
    return;
  }

  state.reports.forEach(r => {
    // Null-safe numeric values
    const dist       = Number(r.totalDistance      || 0).toFixed(1);
    const fuelL      = Number(r.totalFuelLiters    || 0).toFixed(1);
    const fuelCost   = Number(r.totalFuelCost      || 0).toFixed(2);
    const maintCost  = Number(r.totalMaintenanceCost || 0).toFixed(2);
    const opCost     = Number(r.totalOpCost        || 0).toFixed(2);
    const revenue    = Number(r.totalRevenue       || 0).toFixed(2);
    const fuelEff    = Number(r.fuelEfficiency     || 0).toFixed(2);
    const roiVal     = Number(r.roi                || 0);
    const roiPct     = (roiVal * 100).toFixed(2);

    let roiClass = roiVal >= 0 ? 'badge-success' : 'badge-danger';
    let iconSrc = 'assets/van.png';
    if (r.type === 'Truck') iconSrc = 'assets/truck.png';
    if (r.type === 'Sedan') iconSrc = 'assets/sedan.png';

    tbody.innerHTML += `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${iconSrc}" style="width:28px; height:28px; border-radius:4px; object-fit:cover; background:rgba(255,255,255,0.03);" alt="${r.type}">
            <div>
              <strong>${r.name_model || '—'}</strong>
              <div style="font-size:11px; color:var(--text-sub);">${r.registration_number}</div>
            </div>
          </div>
        </td>
        <td>${r.type}</td>
        <td>${dist} km</td>
        <td>${fuelL} L</td>
        <td>${formatCurrency(fuelCost)}</td>
        <td>${formatCurrency(maintCost)}</td>
        <td>${formatCurrency(opCost)}</td>
        <td>${formatCurrency(revenue)}</td>
        <td>${fuelEff > 0 ? fuelEff + ' km/L' : '<span style="color:var(--text-muted)">N/A</span>'}</td>
        <td><span class="badge ${roiClass}">${roiPct}%</span></td>
      </tr>
    `;
  });

  // Attach auth token to export download link dynamically
  const exportBtn = document.getElementById('btn-csv-export');
  
  // Custom override to intercept export clicked to send header if needed
  exportBtn.onclick = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/reports/export`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "transitops_fleet_report.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      showNotification('CSV export failed: ' + err.message, 'danger');
    }
  };
}

// =================---------------- MODAL DISMISS CONTROLS ----------------=================

document.querySelectorAll('.btn-close-modal').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
  });
});

// =================---------------- THEME / TOGGLE CONFIGS ----------------=================

const themeToggleBtn = document.getElementById('btn-theme-toggle');
const htmlEl = document.documentElement;

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = htmlEl.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  htmlEl.setAttribute('data-theme', newTheme);
  localStorage.setItem('transitops_theme', newTheme);

  // Redraw chart to refresh font color immediately if on dashboard
  if (state.activeTab === 'dashboard' && state.token) {
    fetchDashboardStats();
  }
});

// Load theme on startup
const savedTheme = localStorage.getItem('transitops_theme') || 'dark';
htmlEl.setAttribute('data-theme', savedTheme);

// Bind inline action handlers explicitly to the window object to prevent scoping errors
window.openVehicleModal = openVehicleModal;
window.deleteVehicle = deleteVehicle;
window.openDriverModal = openDriverModal;
window.deleteDriver = deleteDriver;
window.dispatchTrip = dispatchTrip;
window.openCompleteTripModal = openCompleteTripModal;
window.cancelTrip = cancelTrip;
window.openDocumentModal = openDocumentModal;

// =================-------- PDF EXPORT --------=================
document.getElementById('btn-pdf-export').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { showNotification('PDF library not loaded. Try again.', 'danger'); return; }
  if (!state.reports || state.reports.length === 0) { showNotification('No report data to export.', 'danger'); return; }

  const doc = new jsPDF({ orientation: 'landscape' });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(99, 102, 241);
  doc.text('TransitOps — Fleet ROI & Analytics Report', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

  // Table
  doc.autoTable({
    startY: 32,
    head: [['Vehicle', 'Type', 'Distance (km)', 'Fuel (L)', 'Fuel Cost (₹)', 'Maint Cost (₹)', 'Op Cost (₹)', 'Revenue (₹)', 'Fuel Eff (km/L)', 'ROI (%)']],
    body: state.reports.map(r => [
      `${r.name_model}\n${r.registration_number}`,
      r.type,
      Number(r.totalDistance || 0).toFixed(1),
      Number(r.totalFuelLiters || 0).toFixed(1),
      Number(r.totalFuelCost || 0).toFixed(2),
      Number(r.totalMaintenanceCost || 0).toFixed(2),
      Number(r.totalOpCost || 0).toFixed(2),
      Number(r.totalRevenue || 0).toFixed(2),
      Number(r.fuelEfficiency || 0) > 0 ? Number(r.fuelEfficiency).toFixed(2) : 'N/A',
      (Number(r.roi || 0) * 100).toFixed(2) + '%'
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 35 } }
  });

  doc.save('TransitOps_Fleet_Report.pdf');
  showNotification('PDF exported successfully!', 'success');
});

// =================-------- EMAIL REMINDERS --------=================
document.getElementById('btn-send-reminders').addEventListener('click', async () => {
  const modal = document.getElementById('modal-reminders');
  const body = document.getElementById('reminder-result-body');
  body.innerHTML = '<div style="text-align:center; padding:24px; color:var(--text-sub);"><i class="bx bx-loader-alt bx-spin" style="font-size:32px;"></i><br>Scanning driver licenses & sending alerts...</div>';
  modal.classList.add('show');

  try {
    const res = await authFetch(`${API_BASE}/drivers/send-reminders`, { method: 'POST' });
    const data = await res.json();

    if (data.sent === 0) {
      body.innerHTML = `<div style="text-align:center; padding:24px;">
        <i class="bx bx-check-circle" style="font-size:48px; color:var(--color-success);"></i>
        <h3 style="margin:12px 0 6px; color:var(--color-success)">All Drivers Compliant!</h3>
        <p style="color:var(--text-sub)">No expiring licenses found. Fleet is fully compliant.</p>
      </div>`;
    } else {
      const rows = data.drivers.map(d => `
        <div style="display:flex; align-items:center; gap:12px; padding:10px; border-radius:8px; background:var(--bg-card); margin-bottom:8px; border:1px solid var(--border-color);">
          <i class="bx ${d.expired ? 'bx-error-circle' : 'bx-alarm'}" style="font-size:22px; color:${d.expired ? 'var(--color-danger)' : 'var(--color-warning)'};"></i>
          <div>
            <div style="font-weight:600;">${d.name}</div>
            <div style="font-size:12px; color:var(--text-sub);">${d.license} — <span style="color:${d.expired ? 'var(--color-danger)' : 'var(--color-warning)'};">${d.expired ? '⚠️ EXPIRED' : 'Expiring'}</span> on ${d.expiry}</div>
          </div>
        </div>`).join('');

      const previewLink = data.previewUrl
        ? `<div style="margin-top:12px; padding:10px; background:rgba(99,102,241,0.08); border-radius:8px; font-size:12px;">
            <i class="bx bx-link-external"></i> <strong>Preview Email:</strong>
            <a href="${data.previewUrl}" target="_blank" style="color:var(--color-primary); margin-left:4px;">${data.previewUrl}</a>
          </div>` : '';

      body.innerHTML = `
        <div style="text-align:center; padding:12px 0 16px;">
          <i class="bx bx-send" style="font-size:40px; color:var(--color-primary);"></i>
          <h3 style="margin:8px 0 4px;">Reminders Sent for ${data.sent} Driver(s)</h3>
          <p style="color:var(--text-sub); font-size:13px;">${data.message}</p>
        </div>
        ${rows}
        ${previewLink}`;
    }
  } catch (err) {
    body.innerHTML = `<div style="text-align:center; padding:24px; color:var(--color-danger);">
      <i class="bx bx-error" style="font-size:36px;"></i><br>Error: ${err.message}
    </div>`;
  }
});

// =================-------- VEHICLE DOCUMENT MANAGEMENT --------=================
let currentDocVehicleId = null;

async function openDocumentModal(vehicleId, vehicleName) {
  currentDocVehicleId = vehicleId;
  const modal = document.getElementById('modal-documents');
  document.getElementById('doc-vehicle-info').innerHTML = `<i class="bx bx-car"></i> <strong>${vehicleName}</strong> — Registration Documents & Files`;
  document.getElementById('doc-file-input').value = '';
  modal.classList.add('show');
  await refreshDocList();
}

async function refreshDocList() {
  const docList = document.getElementById('doc-list');
  docList.innerHTML = '<div style="color:var(--text-sub); font-size:13px; padding:8px;">Loading documents...</div>';

  try {
    const res = await authFetch(`${API_BASE}/vehicles/${currentDocVehicleId}/documents`);
    const files = await res.json();

    if (!files.length) {
      docList.innerHTML = '<div style="color:var(--text-muted); font-size:13px; padding:8px; text-align:center;"><i class="bx bx-folder-open" style="font-size:28px; display:block; margin-bottom:4px;"></i>No documents uploaded yet.</div>';
      return;
    }

    docList.innerHTML = files.map(f => `
      <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:8px; background:var(--bg-card); border:1px solid var(--border-color); margin-bottom:8px;">
        <i class="bx ${f.name.endsWith('.pdf') ? 'bxs-file-pdf' : 'bxs-file-image'}" style="font-size:22px; color:var(--color-primary);"></i>
        <span style="flex:1; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</span>
        <a href="${f.url}" target="_blank" class="btn btn-secondary btn-sm" style="padding:4px 10px; font-size:12px;"><i class="bx bx-download"></i> View</a>
        <button onclick="deleteDocument('${f.filename}')" class="btn btn-danger btn-sm" style="padding:4px 10px; font-size:12px;"><i class="bx bx-trash"></i></button>
      </div>`).join('');
  } catch (err) {
    docList.innerHTML = `<div style="color:var(--color-danger); font-size:13px; padding:8px;">Error: ${err.message}</div>`;
  }
}

document.getElementById('btn-upload-doc').addEventListener('click', async () => {
  const fileInput = document.getElementById('doc-file-input');
  if (!fileInput.files.length) { showNotification('Please choose a file first.', 'danger'); return; }

  const formData = new FormData();
  formData.append('document', fileInput.files[0]);

  try {
    const res = await fetch(`${API_BASE}/vehicles/${currentDocVehicleId}/documents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showNotification('Document uploaded successfully!', 'success');
    fileInput.value = '';
    await refreshDocList();
  } catch (err) {
    showNotification('Upload failed: ' + err.message, 'danger');
  }
});

async function deleteDocument(filename) {
  if (!confirm('Delete this document?')) return;
  try {
    const res = await authFetch(`${API_BASE}/vehicles/${currentDocVehicleId}/documents/${filename}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showNotification('Document deleted.', 'success');
    await refreshDocList();
  } catch (err) {
    showNotification('Delete failed: ' + err.message, 'danger');
  }
}
window.deleteDocument = deleteDocument;

// Initialize App
checkAuth();
