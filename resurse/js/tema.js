document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcher = document.getElementById('theme-switcher');
    const themeIcon = document.getElementById('theme-icon');

    const setTheme = (themeName) => {
        document.body.classList.remove('light-theme', 'dark-theme');

        document.body.classList.add(themeName);

        localStorage.setItem('theme', themeName);

        if (themeName === 'dark-theme') {
            themeIcon.classList.remove('bi-sun');
            themeIcon.classList.add('bi-moon');
        } else {
            themeIcon.classList.remove('bi-moon');
            themeIcon.classList.add('bi-sun');
        }
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
        themeSwitcher.checked = (savedTheme === 'dark-theme');
    } else {
        setTheme('light-theme');
        themeSwitcher.checked = false;
    }

    themeSwitcher.addEventListener('change', () => {
        if (themeSwitcher.checked) {
            setTheme('dark-theme');
        } else {
            setTheme('light-theme');
        }
    });
});