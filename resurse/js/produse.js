window.onload = function() {
    let btn = document.getElementById("filtrare");
    btn.onclick = function() {
        let inpNume = document.getElementById("inp-nume").value.trim().toLowerCase();

        let vectRadio = document.getElementsByName("gr_rad");

        let inpCalorii = null;
        let minCalorii = null;
        let maxCalorii = null;
        for (let rad of vectRadio) {
            if (rad.checked) {
                inpCalorii = rad.value;
                if (rad.value != "toate") {
                    [minCalorii, maxCalorii] = inpCalorii.split(":"); //"350:700" -> ["350", "700"]
                    minCalorii = parseInt(minCalorii);
                    maxCalorii = parseInt(maxCalorii);
                }
                break;
            }
        }

        let inpPret = document.getElementById("inp-pret").value;

        let inpCategorie = document.getElementById("inp-categorie").value.trim().toLowerCase();

        let produse = document.getElementsByClassName("produs");
        for (let prod of produse) {
            prod.style.display = "none";
            let nume = prod.getElementsByClassName("val-nume")[0].innerHTML.trim().toLowerCase();
            let calorii = parseInt(prod.getElementsByClassName("val-calorii")[0].innerHTML.trim());
            let pret = parseFloat(prod.getElementsByClassName("val-pret")[0].innerHTML.trim());
            let categorie = prod.getElementsByClassName("val-categorie")[0].innerHTML.trim().toLowerCase();

            let cond1 = nume.startsWith(inpNume);
            let cond2 = (inpCalorii == "toate" || (minCalorii <= calorii && calorii < maxCalorii));
            let cond3 = inpPret <= pret;
            let cond4 = (inpCategorie == "toate" || inpCategorie == categorie);

            if (cond1 && cond2 && cond3 && cond4) {
                prod.style.display = "block";
            }
        }
    };

    let themeSwitcher = document.getElementById("theme-switcher");
    themeSwitcher.onclick = function() {
        let body = document.body;
        body.classList.toggle("dark-theme");
    };
};