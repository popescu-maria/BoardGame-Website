const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.set("view engine", "ejs");

obGlobal = {
    obErori: null
};

function initErori() {
    let continut = fs.readFileSync(path.join(__dirname, "resurse/json/erori.json"), "utf-8");
    obGlobal.obErori = JSON.parse(continut);

    obGlobal.obErori.eroare_default.imagine = path.join(obGlobal.obErori.cale_baza, obGlobal.obErori.eroare_default.imagine);
    for (let eroare of obGlobal.obErori.info_erori) {
        eroare.imagine = path.join(obGlobal.obErori.cale_baza, eroare.imagine);
    }
    console.log(obGlobal.obErori);
}
initErori();

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find(elem => elem.identificator == identificator);

    if (eroare) {
        if (eroare.status) res.status(identificator);
        titlu = titlu || eroare.titlu;
        text = text || eroare.text;
        imagine = imagine || eroare.imagine;
    } else {
        let err = obGlobal.obErori.eroare_default;
        titlu = titlu || err.titlu;
        text = text || err.text;
        imagine = imagine || err.imagine;
    }

    res.render("pagini/eroare", { titlu, text, imagine });
}

console.log("Folderul proiectului: ", __dirname);
console.log("Cale fisier index.js: ", __filename);
console.log("Folderul de lucru: ", process.cwd());

app.use("/resurse", express.static(path.join(__dirname, 'resurse')));

app.get("/favicon.ico", function(req, res) {
    res.sendFile(path.join(__dirname, "resurse/ico/favicon.ico"));
})

app.get(["/", "/home", "/index"], (req, res) => {
    res.render("pagini/index", { ip: req.ip });
});

app.get("/index/a", (req, res) => {
    res.render("pagini/index");
});

app.get("/cerere", (req, res) => {
    res.send("<p style='color:green;'>Buna ziua!</p>");
});

app.get("/fisier", (req, res) => {
    res.sendFile(path.join(__dirname, "package.json")); // Fixed typo
});

app.get("/abc", (req, res, next) => {
    res.write("Data curenta: ");
    next();
});

app.get("/abc", (req, res) => {
    res.write(new Date().toString());
    res.end();
});
app.get("/*.ejs", function (req, res, next) {
    afisareEroare(res, 400);
})

app.get("/*", (req, res) => {
    try {
        res.render("pagini" + req.url, (err, rezultatRandare) => {
            if (err) {
                if (err.message.startsWith("Failed to lookup view")) {
                    afisareEroare(res, 404);
                } else {
                    afisareEroare(res);
                }
            }
        });
    } catch (errRandare) {
        if (errRandare.message.startsWith("Cannot find module")) {
            afisareEroare(res, 404);
        } else {
            afisareEroare(res);
        }
    }
});


app.listen(8080, () => {
    console.log("Serverul a pornit pe portul 8080");
});
