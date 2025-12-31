// auth-guard.js - Protect pages that require authentication
import { isAuthenticated } from './api.js';

// Check if user is authenticated, redirect to login if not
if (!isAuthenticated()) {
    window.location.href = 'login.html';
}
