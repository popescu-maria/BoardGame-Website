window.addEventListener("DOMContentLoaded", function () {
    document.getElementById("theme-switcher").onclick = function () {
        const themeIcon = document.getElementById("theme-icon");
        if(document.body.classList.contains("light-theme")){
            localStorage.setItem("theme", "dark");
            themeIcon.classList.remove("fa-sun");
            themeIcon.classList.add("fa-moon");
        } else {
            localStorage.setItem("theme", "light");
            themeIcon.classList.remove("fa-moon");
            themeIcon.classList.add("fa-sun");
        }
    };
});