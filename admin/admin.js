// Mumbai Share Auto - Admin Panel JavaScript

// API Base URL configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : 'https://your-production-api.com/api';

// Global variables
let authToken = null;
let standsData = [];
let deleteItemType = null;
let deleteItemId = null;
let editMode = false;
let editItemId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('login.html')) {
    setupLoginForm();
  } else {
    checkAuth();
    if (authToken) {
      fetchStands();
      setupEventListeners();
    }
  }
});

// === Authentication ===

function setupLoginForm() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('error-message');

  errorDiv.style.display = 'none';

  if (!username || !password || password.length < 6) {
    showError('error-message', 'Please fill in all fields');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      localStorage.setItem('auth_token', data.token);
      window.location.href = 'index.html';
    } else {
      showError('error-message', data.message || 'Invalid username or password');
    }
  } catch (error) {
    showError('error-message', 'Login failed. Please try again.');
    console.error('Login error:', error);
  }
}

function checkAuth() {
  authToken = localStorage.getItem('auth_token');

  if (!authToken) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem('auth_token');
  window.location.href = 'login.html';
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
}

// === Setup Event Listeners ===

function setupEventListeners() {
  // Logout button
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Add buttons
  document.getElementById('add-stand-btn').addEventListener('click', () => openStandModal('add'));
  document.getElementById('add-route-btn').addEventListener('click', () => openRouteModal('add'));

  // Form submissions
  document.getElementById('stand-form').addEventListener('submit', handleStandFormSubmit);
  document.getElementById('route-form').addEventListener('submit', handleRouteFormSubmit);

  // Delete confirmation
  document.getElementById('confirm-delete-btn').addEventListener('click', handleDelete);

  // Modal close buttons
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', function() {
      const modal = this.closest('.modal');
      closeModal(modal.id);
    });
  });

  // Click outside modal to close
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal(this.id);
      }
    });
  });
}

// === Fetch and Render Data ===

async function fetchStands() {
  try {
    const response = await fetch(`${API_BASE_URL}/stands`);
    const data = await response.json();

    if (data.success) {
      standsData = data.stands;
      renderStandsTable(standsData);
      renderRoutesTable(standsData);
    } else {
      alert('Failed to fetch stands data');
    }
  } catch (error) {
    console.error('Fetch stands error:', error);
    alert('Failed to load data. Please refresh the page.');
  }
}

function renderStandsTable(stands) {
  const tbody = document.getElementById('stands-table-body');
  tbody.innerHTML = '';

  stands.forEach(stand => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${stand.name}</td>
      <td>${stand.latitude}, ${stand.longitude}</td>
      <td>${stand.operating_hours}</td>
      <td>${stand.routes.length} routes</td>
      <td>
        <button class="btn-edit" onclick="openStandModal('edit', ${stand.id})">Edit</button>
        <button class="btn-delete" onclick="openDeleteModal('stand', ${stand.id}, '${stand.name}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderRoutesTable(stands) {
  const tbody = document.getElementById('routes-table-body');
  tbody.innerHTML = '';

  stands.forEach(stand => {
    stand.routes.forEach(route => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${stand.name}</td>
        <td>${route.destination}</td>
        <td>₹${route.fare}</td>
        <td>${route.travel_time}</td>
        <td>
          <button class="btn-edit" onclick="openRouteModal('edit', ${route.id}, ${stand.id})">Edit</button>
          <button class="btn-delete" onclick="openDeleteModal('route', ${route.id}, '${route.destination}')">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  });
}

// === Modal Management ===

function openStandModal(mode, standId = null) {
  const modal = document.getElementById('stand-modal');
  const title = document.getElementById('stand-modal-title');
  const form = document.getElementById('stand-form');

  form.reset();
  clearError('stand-error');

  editMode = mode === 'edit';
  editItemId = standId;

  if (editMode) {
    title.textContent = 'Edit Stand';
    const stand = standsData.find(s => s.id === standId);
    if (stand) {
      document.getElementById('stand-id').value = stand.id;
      document.getElementById('stand-name').value = stand.name;
      document.getElementById('stand-latitude').value = stand.latitude;
      document.getElementById('stand-longitude').value = stand.longitude;
      document.getElementById('stand-hours').value = stand.operating_hours;
    }
  } else {
    title.textContent = 'Add New Stand';
    document.getElementById('stand-id').value = '';
  }

  modal.classList.add('active');
}

function openRouteModal(mode, routeId = null, standId = null) {
  const modal = document.getElementById('route-modal');
  const title = document.getElementById('route-modal-title');
  const form = document.getElementById('route-form');
  const standSelect = document.getElementById('route-stand');

  form.reset();
  clearError('route-error');

  // Populate stand dropdown
  standSelect.innerHTML = '<option value="">-- Choose Stand --</option>';
  standsData.forEach(stand => {
    const option = document.createElement('option');
    option.value = stand.id;
    option.textContent = stand.name;
    standSelect.appendChild(option);
  });

  editMode = mode === 'edit';
  editItemId = routeId;

  if (editMode) {
    title.textContent = 'Edit Route';

    // Find the route
    let foundRoute = null;
    let foundStandId = null;
    for (const stand of standsData) {
      const route = stand.routes.find(r => r.id === routeId);
      if (route) {
        foundRoute = route;
        foundStandId = stand.id;
        break;
      }
    }

    if (foundRoute) {
      document.getElementById('route-id').value = foundRoute.id;
      document.getElementById('route-stand').value = foundStandId;
      document.getElementById('route-destination').value = foundRoute.destination;
      document.getElementById('route-fare').value = foundRoute.fare;
      document.getElementById('route-time').value = foundRoute.travel_time;

      // Disable stand selection in edit mode
      standSelect.disabled = true;
    }
  } else {
    title.textContent = 'Add New Route';
    document.getElementById('route-id').value = '';
    standSelect.disabled = false;

    if (standId) {
      standSelect.value = standId;
    }
  }

  modal.classList.add('active');
}

function openDeleteModal(type, id, name) {
  const modal = document.getElementById('delete-modal');
  const message = document.getElementById('delete-message');

  deleteItemType = type;
  deleteItemId = id;

  if (type === 'stand') {
    message.textContent = `Delete "${name}"? This will also delete all associated routes.`;
  } else {
    message.textContent = `Delete route to "${name}"?`;
  }

  modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('active');
}

// === Form Handlers ===

async function handleStandFormSubmit(e) {
  e.preventDefault();
  clearError('stand-error');

  const name = document.getElementById('stand-name').value.trim();
  const latitude = parseFloat(document.getElementById('stand-latitude').value);
  const longitude = parseFloat(document.getElementById('stand-longitude').value);
  const operating_hours = document.getElementById('stand-hours').value.trim();

  // Client-side validation
  if (name.length < 3 || name.length > 100) {
    showError('stand-error', 'Name must be between 3 and 100 characters');
    return;
  }

  if (latitude < 18.8 || latitude > 19.3) {
    showError('stand-error', 'Invalid latitude - must be between 18.8 and 19.3');
    return;
  }

  if (longitude < 72.7 || longitude > 73.0) {
    showError('stand-error', 'Invalid longitude - must be between 72.7 and 73.0');
    return;
  }

  if (!operating_hours) {
    showError('stand-error', 'Operating hours required');
    return;
  }

  const standData = { name, latitude, longitude, operating_hours };

  try {
    let response;
    if (editMode) {
      response = await fetch(`${API_BASE_URL}/stands/${editItemId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(standData)
      });
    } else {
      response = await fetch(`${API_BASE_URL}/stands`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(standData)
      });
    }

    const data = await response.json();

    if (response.ok && data.success) {
      closeModal('stand-modal');
      fetchStands();
    } else {
      if (response.status === 401) {
        logout();
      } else {
        showError('stand-error', data.message || 'Failed to save stand');
      }
    }
  } catch (error) {
    console.error('Stand form submit error:', error);
    showError('stand-error', 'Failed to save stand. Please try again.');
  }
}

async function handleRouteFormSubmit(e) {
  e.preventDefault();
  clearError('route-error');

  const stand_id = parseInt(document.getElementById('route-stand').value);
  const destination = document.getElementById('route-destination').value.trim();
  const fare = parseFloat(document.getElementById('route-fare').value);
  const travel_time = document.getElementById('route-time').value.trim();

  // Client-side validation
  if (!stand_id) {
    showError('route-error', 'Please select a stand');
    return;
  }

  if (destination.length < 3 || destination.length > 100) {
    showError('route-error', 'Destination must be between 3 and 100 characters');
    return;
  }

  if (fare < 5 || fare > 200) {
    showError('route-error', 'Fare must be between ₹5 and ₹200');
    return;
  }

  if (!travel_time) {
    showError('route-error', 'Travel time required');
    return;
  }

  const routeData = editMode
    ? { destination, fare, travel_time }
    : { stand_id, destination, fare, travel_time };

  try {
    let response;
    if (editMode) {
      response = await fetch(`${API_BASE_URL}/routes/${editItemId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(routeData)
      });
    } else {
      response = await fetch(`${API_BASE_URL}/routes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(routeData)
      });
    }

    const data = await response.json();

    if (response.ok && data.success) {
      closeModal('route-modal');
      fetchStands();
    } else {
      if (response.status === 401) {
        logout();
      } else {
        showError('route-error', data.message || 'Failed to save route');
      }
    }
  } catch (error) {
    console.error('Route form submit error:', error);
    showError('route-error', 'Failed to save route. Please try again.');
  }
}

async function handleDelete() {
  if (!deleteItemType || !deleteItemId) return;

  const endpoint = deleteItemType === 'stand'
    ? `${API_BASE_URL}/stands/${deleteItemId}`
    : `${API_BASE_URL}/routes/${deleteItemId}`;

  try {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (response.ok && data.success) {
      closeModal('delete-modal');
      fetchStands();
    } else {
      if (response.status === 401) {
        logout();
      } else {
        alert(data.message || 'Failed to delete item');
      }
    }
  } catch (error) {
    console.error('Delete error:', error);
    alert('Failed to delete item. Please try again.');
  }
}

// === Utility Functions ===

function showError(elementId, message) {
  const errorDiv = document.getElementById(elementId);
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function clearError(elementId) {
  const errorDiv = document.getElementById(elementId);
  errorDiv.textContent = '';
  errorDiv.style.display = 'none';
}
