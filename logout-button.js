// logout-button.js - Add logout functionality to navigation
import { authAPI } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Find the navigation area and add logout button
    const nav = document.querySelector('nav');
    if (nav) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'text-sm font-medium text-text-sub dark:text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1';
        logoutBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">logout</span> Logout';

        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                authAPI.logout();
            }
        });

        nav.appendChild(logoutBtn);
    }
});
