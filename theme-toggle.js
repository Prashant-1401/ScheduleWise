const html = document.documentElement;
const toggleBtn = document.getElementById('theme-toggle');
const toggleIcon = document.getElementById('theme-toggle-icon');

// Function to set the theme based on preference
function setTheme(theme) {
    if (theme === 'dark') {
        html.classList.add('dark');
        localStorage.theme = 'dark';
        toggleIcon.textContent = 'light_mode'; // Sun icon for light mode
    } else {
        html.classList.remove('dark');
        localStorage.theme = 'light';
        toggleIcon.textContent = 'dark_mode'; // Moon icon for dark mode
    }
}

// 1. Check local storage or system preference on initial load
const storedTheme = localStorage.theme;
if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    setTheme('dark');
} else {
    setTheme('light');
}

// 2. Event listener for button click
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        // Toggle the theme
        const newTheme = html.classList.contains('dark') ? 'light' : 'dark';
        setTheme(newTheme);
    });
}