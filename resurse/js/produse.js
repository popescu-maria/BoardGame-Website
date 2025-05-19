window.onload = function () {

    //min si max la range button
    let range = document.getElementById("inp-pret");
    let spanMin = document.createElement("span");
    spanMin.id = "val-min";
    spanMin.innerText = `${range.min} lei`;
    let spanMax = document.createElement("span");
    spanMax.id = "val-max";
    spanMax.innerText = `${range.max} lei`;
    let container = range.parentNode;
    container.insertBefore(spanMin, range);
    container.insertBefore(spanMax, range.nextSibling);

    function levenshteinDistance(a, b) {
        const dp = Array.from({ length: a.length + 1 }, () =>
            Array(b.length + 1).fill(0)
        );

        for (let i = 0; i <= a.length; i++) dp[i][0] = i;
        for (let j = 0; j <= b.length; j++) dp[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                if (a[i - 1] === b[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j - 1],
                        dp[i - 1][j],
                        dp[i][j - 1]
                    ) + 1;
                }
            }
        }
        return dp[a.length][b.length];
    }

    document.getElementById("filtrare").onclick = function () {
        let inpNume = document.getElementById("inp-nume").value.trim().toLowerCase();

        if (inpNume !== "" && !/^[a-z0-9 :]+$/i.test(inpNume)) {
            alert("Input invalid!");
            return;
        }

        let inpVarsta = parseInt(document.getElementById("inp-varsta").value);
        let selComponente = document.getElementById("inp-componente");
        let componenteSelectate = Array.from(selComponente.selectedOptions).map(opt => opt.value);

        let inpJucatori = null;
        let minJuc = null;
        let maxJuc = null;
        let vectRadio = document.getElementsByName("options");
        for (let rad of vectRadio) {
            if (rad.checked) {
                inpJucatori = rad.value;
                if (inpJucatori !== "toate") {
                    [minJuc, maxJuc] = inpJucatori.split(":").map(x => parseInt(x));
                }
                break;
            }
        }

        let inpPret = parseFloat(document.getElementById("inp-pret").value);
        let inpCategorie = document.getElementById("inp-categorie").value.trim().toLowerCase();

        let produse = document.getElementsByClassName("produs");
        for (let prod of produse) {
            let nume = prod.getElementsByClassName("val-nume")[0].innerText.trim().toLowerCase();
            let varsta = parseInt(prod.getElementsByClassName("val-varsta")[0].innerText.trim());
            let jucatori = parseInt(prod.getElementsByClassName("val-jucatori")[0].innerText.trim());
            let pret = parseFloat(prod.getElementsByClassName("val-pret")[0].innerText.trim());
            let categorie = prod.getElementsByClassName("val-categorie")[0].innerText.trim().toLowerCase();
            let componenteProdus = prod.getElementsByClassName("val-componente")[0]
                .innerText.trim().toLowerCase().split(/\s*,\s*/);

            let cond1 = nume.startsWith(inpNume) || levenshteinDistance(nume, inpNume) <= 2;
            let cond2 = varsta >= inpVarsta;
            let cond3 = (inpJucatori === "toate" || (jucatori >= minJuc && jucatori <= maxJuc));
            let cond4 = pret >= inpPret;
            let cond5 = (inpCategorie === "toate" || inpCategorie === categorie);
            let cond6 = componenteSelectate.includes("orice") ||
                componenteSelectate.every(comp => componenteProdus.includes(comp));

            prod.style.display = (cond1 && cond2 && cond3 && cond4 && cond5 && cond6) ? "block" : "none";
        }
    };

    document.getElementById("inp-pret").onchange = function () {
        document.getElementById("infoRange").innerText = `(${this.value})`;
    };

    document.getElementById("resetare").onclick = function () {
        if (!confirm("Ești sigur că vrei să resetezi toate filtrele?")) {
            return;
        }

        document.getElementById("inp-nume").value = "";
        document.getElementById("inp-varsta").value = 0;
        document.getElementById("inp-pret").value = 0;
        document.getElementById("infoRange").innerText = "(0)";
        document.getElementById("inp-categorie").value = "toate";
        document.getElementById("i_rad4").checked = true;

        const selComponente = document.getElementById("inp-componente");
        for (let opt of selComponente.options) {
            opt.selected = false;
        }

        let produse = document.getElementsByClassName("produs");
        for (let prod of produse) {
            prod.style.display = "block";
        }
    };

    document.getElementById("sortCrescNume").onclick = function () {
        sorteaza(1);
    };
    document.getElementById("sortDescrescNume").onclick = function () {
        sorteaza(-1);
    };


    function sorteaza(semn) {
        let produse = document.getElementsByClassName("produs");
        let vProduse = Array.from(produse);
        vProduse.sort((a, b) => {
            let pretA = parseFloat(a.getElementsByClassName("val-pret")[0].innerText.trim());
            let pretB = parseFloat(b.getElementsByClassName("val-pret")[0].innerText.trim());
            if (pretA !== pretB) return semn * (pretA - pretB);

            let numeA = a.getElementsByClassName("val-nume")[0].innerText.trim().toLowerCase();
            let numeB = b.getElementsByClassName("val-nume")[0].innerText.trim().toLowerCase();
            return semn * numeA.localeCompare(numeB);
        });

        for (let prod of vProduse) {
            prod.parentNode.appendChild(prod);
        }
    }

    let radioButtons = document.querySelectorAll(".btn-group-toggle input[type=radio]");

    radioButtons.forEach(radio => {
        radio.addEventListener("change", function () {
            radioButtons.forEach(r => r.parentElement.classList.remove("active"));

            if (this.checked) {
                this.parentElement.classList.add("active");
            }
        });

        if (radio.checked) {
            radio.parentElement.classList.add("active");
        }
    });

    window.onkeydown = function (e) {
        if (e.key === "c" && e.altKey) {
            let produse = document.getElementsByClassName("produs");
            let sumaPreturi = 0;
            for (let prod of produse) {
                if (prod.style.display !== "none") {
                    let pret = parseFloat(prod.getElementsByClassName("val-pret")[0].innerText.trim());
                    sumaPreturi += pret;
                }
            }

            if (!document.getElementById("sum_preturi")) {
                let pRezultat = document.createElement("p");
                pRezultat.innerHTML = `Suma prețurilor: ${sumaPreturi.toFixed(2)} lei`;
                pRezultat.id = "sum_preturi";
                let p = document.getElementById("p-suma");
                p.parentNode.insertBefore(pRezultat, p.nextSibling);

                setTimeout(() => {
                    let p1 = document.getElementById("sum_preturi");
                    if (p1) p1.remove();
                }, 2000);
            }
        }
    };
};