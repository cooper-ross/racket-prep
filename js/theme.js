/** Check for saved theme preference or default to light mode */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    updateThemeButton();
}

/** Toggle between light and dark themes */
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    const theme = isDark ? 'dark' : 'light';

    localStorage.setItem('theme', theme);
    
    updateThemeButton();
}

/** Update theme button text */
function updateThemeButton() {
    const themeButton = document.getElementById('theme-toggle');
    if (themeButton) {
        const isDark = document.body.classList.contains('dark-theme');
        themeButton.textContent = isDark ? 'Light' : 'Dark';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTheme);
} else {
    initializeTheme();
}

window.toggleTheme = toggleTheme;