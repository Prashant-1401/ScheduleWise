// API Service for ScheduleWise Backend
const API_BASE_URL = 'http://localhost:8000';

// Auth helpers
export const getToken = () => localStorage.getItem('auth_token');
export const setToken = (token) => localStorage.setItem('auth_token', token);
export const clearToken = () => localStorage.removeItem('auth_token');
export const isAuthenticated = () => !!getToken();

// API request helper
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

// Auth API
export const authAPI = {
    async register(email, password) {
        const data = await apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        return data;
    },

    async login(email, password) {
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.access_token) {
            setToken(data.access_token);
        }
        return data;
    },

    async getCurrentUser() {
        return apiRequest('/api/auth/me');
    },

    logout() {
        clearToken();
        window.location.href = 'login.html';
    }
};

// Events API
export const eventsAPI = {
    async getAll() {
        return apiRequest('/api/events');
    },

    async create(event) {
        return apiRequest('/api/events', {
            method: 'POST',
            body: JSON.stringify(event)
        });
    },

    async update(id, event) {
        return apiRequest(`/api/events/${id}`, {
            method: 'PUT',
            body: JSON.stringify(event)
        });
    },

    async delete(id) {
        return apiRequest(`/api/events/${id}`, {
            method: 'DELETE'
        });
    }
};

// Profile API
export const profileAPI = {
    async get() {
        return apiRequest('/api/profile');
    },

    async update(profile) {
        return apiRequest('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(profile)
        });
    }
};
