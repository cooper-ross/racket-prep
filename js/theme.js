/** Toggle between light and dark themes */
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark-theme');
    const theme = isDark ? 'dark' : 'light';

    localStorage.setItem('theme', theme);
    
    updateThemeButton();
}

/** Update theme button text */
function updateThemeButton() {
    const themeButton = document.getElementById('theme-toggle');
    if (themeButton) {
        const isDark = document.documentElement.classList.contains('dark-theme');
        themeButton.textContent = isDark ? 'Light' : 'Dark';
    }
}

// Initialize theme button when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateThemeButton);
} else {
    updateThemeButton();
}

window.toggleTheme = toggleTheme;