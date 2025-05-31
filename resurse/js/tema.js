// daca avem mai multe teme verificam care e
if (localStorage.getItem("tema")) {
    document.body.classList.add("dark");
}
else {
    document.body.classList.remove("dark");
}