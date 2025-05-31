const express = require("express");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const sass = require("sass");
const pg = require("pg");
const accesBD=require("./module_proprii/accesbd.js");

// la fiecare query
accesBD.getInstanta().select({tabel: "jocuri", campuri:["*"]}, function(err, rez){
    console.log("----------------------access DB------------------------------------")
    console.log(err)
    console.log(rez)
})

const Client=pg.Client;

const client = new Client({
    database:"proiect",
    user:"maria",
    password:"maria",
    host:"localhost",
    port:5432
})

client.connect()

client.query("select * from jocuri", function(err, rezultat ){
    console.log(err)
    console.log(rezultat)
})

client.query("select * from unnest(enum_range(null::categorie_joc))", function(err, rezultat ){
    console.log(err)
    console.log(rezultat)
})

const app = express();

app.set("view engine", "ejs");

obGlobal = {
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname, "resurse/scss"),
    folderCss: path.join(__dirname, "resurse/css"),
    folderBackup : path.join(__dirname, "backup"),
    optiuniMeniu : null,
};

client.query("select * from unnest(enum_range(null::tipuri_produse))", function(err, rezultat){
    console.log(err)
    obGlobal.optiuniMeniu = rezultat.rows;
})

vect_foldere=["temp", "backup", "temp1"];
for(let folder of vect_foldere) {
    let caleFolder=path.join(__dirname, folder);
    if(!fs.existsSync(caleFolder)){
        fs.mkdirSync(caleFolder);
    }
}

function getSeason() {
    const month = new Date().getMonth() + 1;
    if ([12, 1, 2].includes(month)) return "iarna";
    if ([3, 4, 5].includes(month)) return "primavara";
    if ([6, 7, 8].includes(month)) return "vara";
    if ([9, 10, 11].includes(month)) return "toamna";
}

function compileazaScss(caleScss, caleCss){
    console.log("cale:",caleCss);
    if(!caleCss){

        let numeFisExt=path.basename(caleScss);
        let numeFis=numeFisExt.split(".")[0]   /// "a.scss"  -> ["a","scss"]
        caleCss=numeFis+".css";
    }

    if (!path.isAbsolute(caleScss))
        caleScss=path.join(obGlobal.folderScss,caleScss )
    if (!path.isAbsolute(caleCss))
        caleCss=path.join(obGlobal.folderCss,caleCss )


    let caleBackup=path.join(obGlobal.folderBackup, "resurse/css");
    if (!fs.existsSync(caleBackup)) {
        fs.mkdirSync(caleBackup,{recursive:true})
    }

    // la acest punct avem cai absolute in caleScss si  caleCss

    let numeFisCss=path.basename(caleCss);
    if (fs.existsSync(caleCss)){
        fs.copyFileSync(caleCss, path.join(obGlobal.folderBackup, "resurse/css",numeFisCss ))// +(new Date()).getTime()
    }
    rez = sass.compile(caleScss, {"sourceMap":true});
    fs.writeFileSync(caleCss,rez.css)
    //console.log("Compilare SCSS",rez);
}
//compileazaScss("a.scss");

//la pornirea serverului
vFisiere=fs.readdirSync(obGlobal.folderScss);
for( let numeFis of vFisiere ){
    if (path.extname(numeFis) == ".scss"){
        compileazaScss(numeFis);
    }
}

fs.watch(obGlobal.folderScss, function(eveniment, numeFis){
    console.log(eveniment, numeFis);
    if (eveniment=="change" || eveniment=="rename"){
        let caleCompleta=path.join(obGlobal.folderScss, numeFis);
        if (fs.existsSync(caleCompleta)){
            compileazaScss(caleCompleta);
        }
    }
})

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

function initImagini(){
    var continut= fs.readFileSync(path.join(__dirname,"resurse/json/galerie.json")).toString("utf-8");

    obGlobal.obImagini=JSON.parse(continut);
    let vImagini=obGlobal.obImagini.imagini;

    let caleAbs=path.join(__dirname,obGlobal.obImagini.cale_galerie);
    let caleAbsMediu=path.join(__dirname,obGlobal.obImagini.cale_galerie, "mediu");
    if (!fs.existsSync(caleAbsMediu))
        fs.mkdirSync(caleAbsMediu);

    //for (let i=0; i< vErori.length; i++ )
    for (let imag of vImagini){
        [numeFis, ext]=imag.fisier.split(".");
        let caleFisAbs=path.join(caleAbs,imag.fisier);
        let caleFisMediuAbs=path.join(caleAbsMediu, numeFis+".webp");
        sharp(caleFisAbs).resize(300).toFile(caleFisMediuAbs);
        imag.fisier_mediu=path.join("/", obGlobal.obImagini.cale_galerie, "mediu",numeFis+".webp" )
        imag.fisier=path.join("/", obGlobal.obImagini.cale_galerie, imag.fisier )

    }
    console.log(obGlobal.obImagini)
}
initImagini();

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


app.use("/*", function (req, res, next) {
    res.locals.optiuniMeniu = obGlobal.optiuniMeniu;
    next();
})

app.use("/resurse", express.static(path.join(__dirname, 'resurse')));
app.use("/node_modules", express.static(path.join(__dirname, 'node_modules')));

app.get("/favicon.ico", function(req, res) {
    res.sendFile(path.join(__dirname, "resurse/ico/favicon.ico"));
})

app.get(["/", "/index", "/home"], (req, res) => {
    const sezonCurent = getSeason();
    const imaginiFiltrate = obGlobal.obImagini.imagini.filter(imag => imag.anotimp && imag.anotimp.includes(sezonCurent));
    res.render("pagini/index", { ip: req.ip, imagini: imaginiFiltrate });
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

app.get("/produse", function(req, res){
    console.log(req.query)
    var conditieQuery = ""; // TO DO: where din parametri
    if (req.query.tip) {
        conditieQuery = ` WHERE tip_produs = '${req.query.tip}'`;
    }

    const queryCategorii = "SELECT * FROM unnest(enum_range(null::categorie_joc))";
    const queryProduse = "SELECT * FROM jocuri" + conditieQuery;
    const queryComponente = "SELECT DISTINCT unnest(componente) AS comp FROM jocuri ORDER BY comp";
    const queryMinMaxPret = "SELECT MIN(pret) AS min_pret, MAX(pret) AS max_pret FROM jocuri";
    const queryMaxVarsta = "SELECT MAX(varsta_min) as max_varsta_min FROM jocuri";

    client.query(queryCategorii, function(err, rezCategorii){
        if (err) {
            console.log(err);
            return afisareEroare(res, 2);
        }

        client.query(queryProduse, function(err, rezProduse){
            if (err) {
                console.log(err);
                return afisareEroare(res, 2);
            }

            client.query(queryComponente, function(err, rezComponente){
                if (err) {
                    console.log(err);
                    return afisareEroare(res, 2);
                }

                const componente = rezComponente.rows.map(row => row.comp);

                client.query(queryMinMaxPret, function(err, rezMinMaxPret){
                    if (err) {
                        console.log(err);
                        return afisareEroare(res, 2);
                    }
                    const { min_pret, max_pret } = rezMinMaxPret.rows[0];

                client.query(queryMaxVarsta, function(err, rezMaxVarsta){
                   if (err) {
                       console.log(err);
                       return;
                   }
                        const maxVarstaMin = rezMaxVarsta.rows[0].max_varsta_min;

                res.render("pagini/produse", {
                    produse: rezProduse.rows,
                    optiuni: rezCategorii.rows,
                    componente: componente,
                    minPretDB: parseFloat(min_pret).toFixed(2),
                    maxPretDB: parseFloat(max_pret).toFixed(2),
                    maxVarstaDB: maxVarstaMin
                        });
                    });
                });
            });
        });
    });
});

app.get("/produs/:id", function(req, res){
    client.query(`select * from jocuri where id = ${req.params.id}`, function(err, rez){
        if (err){
            console.log(err);
            afisareEroare(res, 2);
        }
        else{
            if (rez.rowCount==0){
                afisareEroare(res, 404);
            }
            else{
                res.render("pagini/produs", {prod: rez.rows[0]})
            }
        }
    })
})

app.get(/^\/resurse\/[a-zA-Z0-9_\/]*$/, function (req, res, next) {
    afisareEroare(res, 403);
})

app.get("/*.ejs", function (req, res, next) {
    afisareEroare(res, 400);
})

app.get("/*", (req, res) => {
    try {
        res.render(path.join("pagini", req.url), (err, rezultatRandare) => {
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
