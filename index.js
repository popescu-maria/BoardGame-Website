const express = require("express");
const path = require("path");
const fs = require("fs");
const fsp = require("fs").promises;
const sharp = require("sharp");
const sass = require("sass");
const pg = require("pg");

const client = require("./module_proprii/db.js");

client.query("select * from jocuri", function(err, rezultat) {
    console.log(err);
    console.log(rezultat);
});

client.query("select * from unnest(enum_range(null::categorie_joc))", function(err, rezultat) {
    console.log(err);
    console.log(rezultat);
});

const app = express();

app.set("view engine", "ejs");

obGlobal = {
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname, "resurse/scss"),
    folderCss: path.join(__dirname, "resurse/css"),
    folderBackup: path.join(__dirname, "backup"),
    optiuniMeniu: null,
};

client.query("select * from unnest(enum_range(null::tipuri_produse))", function(err, rezultat) {
    console.log(err);
    obGlobal.optiuniMeniu = rezultat.rows;
});

vect_foldere = ["temp", "backup", "temp1"];
for (let folder of vect_foldere) {
    let caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
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

function compileazaScss(caleScss, caleCss) {
    console.log("cale:", caleCss);
    if (!caleCss) {

        let numeFisExt = path.basename(caleScss);
        let numeFis = numeFisExt.split(".")[0];
        caleCss = numeFis + ".css";
    }

    if (!path.isAbsolute(caleScss))
        caleScss = path.join(obGlobal.folderScss, caleScss);
    if (!path.isAbsolute(caleCss))
        caleCss = path.join(obGlobal.folderCss, caleCss);


    let caleBackup = path.join(obGlobal.folderBackup, "resurse/css");
    if (!fs.existsSync(caleBackup)) {
        fs.mkdirSync(caleBackup, { recursive: true });
    }

    let numeFisCss = path.basename(caleCss);
    if (fs.existsSync(caleCss)) {
        fs.copyFileSync(caleCss, path.join(obGlobal.folderBackup, "resurse/css", numeFisCss));
    }
    rez = sass.compile(caleScss, { "sourceMap": true });
    fs.writeFileSync(caleCss, rez.css);
}

vFisiere = fs.readdirSync(obGlobal.folderScss);
for (let numeFis of vFisiere) {
    if (path.extname(numeFis) == ".scss") {
        compileazaScss(numeFis);
    }
}

fs.watch(obGlobal.folderScss, function(eveniment, numeFis) {
    console.log(eveniment, numeFis);
    if (eveniment == "change" || eveniment == "rename") {
        let caleCompleta = path.join(obGlobal.folderScss, numeFis);
        if (fs.existsSync(caleCompleta)) {
            compileazaScss(caleCompleta);
        }
    }
});

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

function initImagini() {
    var continut = fs.readFileSync(path.join(__dirname, "resurse/json/galerie.json")).toString("utf-8");

    obGlobal.obImagini = JSON.parse(continut);
    let vImagini = obGlobal.obImagini.imagini;

    let caleAbs = path.join(__dirname, obGlobal.obImagini.cale_galerie);
    let caleAbsMediu = path.join(__dirname, obGlobal.obImagini.cale_galerie, "mediu");
    if (!fs.existsSync(caleAbsMediu))
        fs.mkdirSync(caleAbsMediu);

    for (let imag of vImagini) {
        let [numeFis, ext] = imag.fisier.split(".");
        let caleFisAbs = path.join(caleAbs, imag.fisier);
        let caleFisMediuAbs = path.join(caleAbsMediu, numeFis + ".webp");
        sharp(caleFisAbs).resize(300).toFile(caleFisMediuAbs);
        imag.fisier_mediu = path.join("/", obGlobal.obImagini.cale_galerie, "mediu", numeFis + ".webp");
        imag.fisier = path.join("/", obGlobal.obImagini.cale_galerie, imag.fisier);

    }
    console.log(obGlobal.obImagini);
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


app.use("/*", function(req, res, next) {
    res.locals.optiuniMeniu = obGlobal.optiuniMeniu;
    next();
});

app.use("/resurse", express.static(path.join(__dirname, 'resurse')));
app.use("/node_modules", express.static(path.join(__dirname, 'node_modules')));

app.get("/favicon.ico", function(req, res) {
    res.sendFile(path.join(__dirname, "resurse/ico/favicon.ico"));
});

const OFFERS_FILE = path.join(__dirname, 'oferte.json');
const OFFER_INTERVAL_MINUTES = 10;
const discountValues = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
let lastGeneratedCategory = null;

async function readOffers() {
    try {
        const data = await fsp.readFile(OFFERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn('oferte.json not found, creating new file.');
            await fsp.writeFile(OFFERS_FILE, JSON.stringify({ oferte: [] }, null, 2), 'utf8');
            return { oferte: [] };
        }
        console.error('Error reading oferte.json:', error);
        return { oferte: [] };
    }
}

async function writeOffers(offersData) {
    try {
        await fsp.writeFile(OFFERS_FILE, JSON.stringify(offersData, null, 2), 'utf8');
        console.log('Offers saved to oferte.json');
    } catch (error) {
        console.error('Error writing oferte.json:', error);
    }
}

async function getCategoriesFromDB() {
    try {
        const result = await client.query('SELECT * FROM unnest(enum_range(null::categorie_joc))');
        return result.rows.map(row => row.unnest);
    } catch (error) {
        console.error('Error fetching categories from database:', error);
        return [];
    }
}

async function generateNewOffer() {
    console.log(`[${new Date().toLocaleTimeString()}] Attempting to generate new offer...`);
    const categories = await getCategoriesFromDB();
    if (categories.length === 0) {
        console.warn('No categories found in database to generate offer.');
        return;
    }

    let selectedCategory;
    if (categories.length === 1) {
        selectedCategory = categories[0];
    } else {
        do {
            selectedCategory = categories[Math.floor(Math.random() * categories.length)];
        } while (selectedCategory === lastGeneratedCategory);
    }

    const selectedDiscount = discountValues[Math.floor(Math.random() * discountValues.length)];

    const now = new Date();
    const startDate = now.toISOString();
    const endDate = new Date(now.getTime() + OFFER_INTERVAL_MINUTES * 60 * 1000).toISOString();

    const newOffer = {
        categorie: selectedCategory,
        "data-incepere": startDate,
        "data-finalizare": endDate,
        reducere: selectedDiscount
    };

    const offersData = await readOffers();
    offersData.oferte.unshift(newOffer);

    await writeOffers(offersData);
    lastGeneratedCategory = selectedCategory;
    console.log(`[${new Date().toLocaleTimeString()}] New offer generated:`, newOffer);
}

app.get('/api/current-offer', async (req, res) => {
    try {
        const offersData = await readOffers();
        const currentOffer = offersData.oferte.length > 0 ? offersData.oferte[0] : null;

        if (currentOffer && new Date(currentOffer["data-finalizare"]) > new Date()) {
            res.json(currentOffer);
        } else {
            res.json(null);
        }
    } catch (error) {
        console.error('Error serving current offer:', error);
        res.status(500).json({ error: 'Failed to retrieve offer' });
    }
});


app.get(["/", "/index", "/home"], (req, res) => {
    const sezonCurent = getSeason();
    const imaginiFiltrate = obGlobal.obImagini.imagini.filter(imag => imag.anotimp && imag.anotimp.includes(sezonCurent));
    res.render("pagini/index", { ip: req.ip, imagini: imaginiFiltrate });
});

app.get("/galerie", (req, res) => {
    const sezonCurent = getSeason();
    const imaginiFiltrate = obGlobal.obImagini.imagini.filter(imag => imag.anotimp && imag.anotimp.includes(sezonCurent));

    res.render("pagini/galerie", {
        imagini: imaginiFiltrate,
        titlu: "Galerie"
    });
});

app.get("/index/a", (req, res) => {
    res.render("pagini/index");
});

app.get("/cerere", (req, res) => {
    res.send("<p style='color:green;'>Buna ziua!</p>");
});

app.get("/fisier", (req, res) => {
    res.sendFile(path.join(__dirname, "package.json"));
});

app.get("/abc", (req, res, next) => {
    res.write("Data curenta: ");
    next();
});

app.get("/abc", (req, res) => {
    res.write(new Date().toString());
    res.end();
});

app.get("/produse", async function(req, res) {
    console.log(req.query);
    var conditieQuery = "";
    if (req.query.tip) {
        conditieQuery = ` WHERE tip_produs = '${req.query.tip}'`;
    }

    const queryCategorii = "SELECT * FROM unnest(enum_range(null::categorie_joc))";
    const queryProduse = "SELECT * FROM jocuri" + conditieQuery;
    const queryComponente = "SELECT DISTINCT unnest(componente) AS comp FROM jocuri ORDER BY comp";
    const queryMinMaxPret = "SELECT MIN(pret) AS min_pret, MAX(pret) AS max_pret FROM jocuri";
    const queryMaxVarsta = "SELECT MAX(varsta_min) as max_varsta_min FROM jocuri";

    let currentOffer = null;
    try {
        const offersData = await readOffers();
        const latestOffer = offersData.oferte.length > 0 ? offersData.oferte[0] : null;

        if (latestOffer && new Date(latestOffer["data-finalizare"]) > new Date()) {
            currentOffer = latestOffer;
        }
    } catch (error) {
        console.error('Error fetching current offer for products page:', error);
    }

    client.query(queryCategorii, function(err, rezCategorii) {
        if (err) {
            console.log(err);
            return afisareEroare(res, 2);
        }

        client.query(queryProduse, function(err, rezProduse) {
            if (err) {
                console.log(err);
                return afisareEroare(res, 2);
            }

            let productsWithPrices = rezProduse.rows;
            if (currentOffer && currentOffer.categorie && currentOffer.reducere) {
                const offerCategory = currentOffer.categorie.toLowerCase();
                const discountPercentage = currentOffer.reducere;

                productsWithPrices = productsWithPrices.map(prod => {
                    if (prod.categorie && prod.categorie.toLowerCase() === offerCategory) {
                        const originalPrice = parseFloat(prod.pret);
                        const newPrice = originalPrice * (1 - discountPercentage / 100);
                        return {
                            ...prod,
                            original_pret: originalPrice.toFixed(2),
                            pret: newPrice.toFixed(2),
                            is_on_sale: true,
                            discount_percentage: discountPercentage
                        };
                    }
                    return prod;
                });
            }

            //Cautam cel mai mic pret in fiecare categorie
            const cheapestProductsPerCategory = {};

            productsWithPrices.forEach(prod => {
                const category = prod.categorie.toLowerCase();
                const price = parseFloat(prod.pret);

                if (!cheapestProductsPerCategory[category] || price < cheapestProductsPerCategory[category].price) {
                    cheapestProductsPerCategory[category] = {
                        price: price,
                        ids: [prod.id]
                    };
                } else if (price === cheapestProductsPerCategory[category].price) {
                    cheapestProductsPerCategory[category].ids.push(prod.id);
                }
            });

            productsWithPrices = productsWithPrices.map(prod => {
                const category = prod.categorie.toLowerCase();
                if (cheapestProductsPerCategory[category] && cheapestProductsPerCategory[category].ids.includes(prod.id)) {
                    return {
                        ...prod,
                        is_cheapest_in_category: true
                    };
                }
                return prod;
            });

            client.query(queryComponente, function(err, rezComponente) {
                if (err) {
                    console.log(err);
                    return afisareEroare(res, 2);
                }

                const componente = rezComponente.rows.map(row => row.comp);

                client.query(queryMinMaxPret, function(err, rezMinMaxPret) {
                    if (err) {
                        console.log(err);
                        return afisareEroare(res, 2);
                    }
                    const { min_pret, max_pret } = rezMinMaxPret.rows[0];

                    client.query(queryMaxVarsta, function(err, rezMaxVarsta) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        const maxVarstaMin = rezMaxVarsta.rows[0].max_varsta_min;

                        res.render("pagini/produse", {
                            produse: productsWithPrices,
                            optiuni: rezCategorii.rows,
                            componente: componente,
                            minPretDB: parseFloat(min_pret).toFixed(2),
                            maxPretDB: parseFloat(max_pret).toFixed(2),
                            maxVarstaDB: maxVarstaMin,
                            currentOffer: currentOffer
                        });
                    });
                });
            });
        });
    });
});

app.get("/produs/:id", async function(req, res) {
    const prodId = req.params.id;
    try {
        const produsResult = await client.query(`SELECT * FROM jocuri WHERE id = $1`, [prodId]);
        if (produsResult.rowCount == 0) return afisareEroare(res, 404);

        const prod = produsResult.rows[0];

        const produseSimilareResult = await client.query(
            `SELECT * FROM jocuri WHERE categorie = $1 AND id != $2 LIMIT 4`,
            [prod.categorie, prodId]
        );
        const similarProducts = produseSimilareResult.rows;

        const setsResult = await client.query(`
            SELECT 
                s.id, s.nume_set, s.descriere_set,
                s.id as set_id
            FROM seturi s
            JOIN asociere_set a ON s.id = a.id_set
            WHERE a.id_produs = $1
            ORDER BY s.id
        `, [prodId]);
        const sets = setsResult.rows;

        for (let set of sets) {
            const produseInSet = await client.query(`
                SELECT j.id, j.pret 
                FROM asociere_set a
                JOIN jocuri j ON a.id_produs = j.id
                WHERE a.id_set = $1
            `, [set.id]);
            const totalPret = produseInSet.rows.reduce((sum, p) => sum + parseFloat(p.pret), 0);
            const n = produseInSet.rows.length;
            const reducereProcent = Math.min(5, n) * 5;
            const pretFinalSet = totalPret * (1 - reducereProcent / 100);
            set.total_pret_initial = totalPret.toFixed(2);
            set.numar_produse = n;
            set.reducere_set = reducereProcent;
            set.pret_final_set = pretFinalSet.toFixed(2);

            const produsCurent = produseInSet.rows.find(p => p.id == prodId);
            if (produsCurent) {
                const proportie = parseFloat(produsCurent.pret) / totalPret;
                set.pret_produs_in_set = (pretFinalSet * proportie).toFixed(2);
            }
        }

        res.render("pagini/produs", {
            prod: prod,
            similarProducts: similarProducts,
            setsOfProduct: sets,
        });
    } catch (err) {
        console.error(err);
        afisareEroare(res, 2);
    }
});

app.get("/seturi", async (req, res) => {
    try {
        const setsResult = await client.query('SELECT id, nume_set, descriere_set FROM seturi ORDER BY id');
        const sets = setsResult.rows;

        const productsInSetsResult = await client.query(`
            SELECT
                s.id AS set_id,
                s.nume_set,
                s.descriere_set,
                j.id AS produs_id,
                j.nume AS produs_nume,
                j.imagine AS produs_imagine,
                j.pret AS produs_pret,
                j.descriere AS produs_descriere
            FROM
                seturi s
            JOIN
                asociere_set a ON s.id = a.id_set
            JOIN
                jocuri j ON a.id_produs = j.id
            ORDER BY
                s.id, j.nume;
        `);
        const productsInSets = productsInSetsResult.rows;

        const organizedSets = sets.map(set => {
            set.produse = productsInSets.filter(prod => prod.set_id === set.id);

            let totalPretInitial = 0;
            if (set.produse && set.produse.length > 0) {
                totalPretInitial = set.produse.reduce((sum, prod) => sum + parseFloat(prod.produs_pret), 0);
            }

            const numarProduse = set.produse ? set.produse.length : 0;
            //calculul reducerii
            const reducereProcent = Math.min(5, numarProduse) * 5;

            const pretFinalSet = totalPretInitial * (1 - reducereProcent / 100);

            set.total_pret_initial = totalPretInitial.toFixed(2);
            set.numar_produse = numarProduse;
            set.reducere_set = reducereProcent;
            set.pret_final_set = pretFinalSet.toFixed(2);

            return set;
        });

        res.render("pagini/seturi", {
            titlu: "Seturi de Produse",
            sets: organizedSets
        });

    } catch (err) {
        console.error("Eroare la preluarea seturilor de produse:", err);
        res.status(500).send("Eroare internă a serverului la încărcarea seturilor.");
    }
});

app.get(/^\/resurse\/[a-zA-Z0-9_\/]*$/, function(req, res, next) {
    afisareEroare(res, 403);
});

app.get("/*.ejs", function(req, res, next) {
    afisareEroare(res, 400);
});

app.get("/*", (req, res) => {
    try {
        res.render(path.join("pagini", req.url), (err, rezultatRandare) => {
            if (err) {
                if (err.message.startsWith("Failed to lookup view")) {
                    afisareEroare(res, 404);
                } else {
                    afisareEroare(res);
                }
            } else {
                res.send(rezultatRandare);
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

app.listen(8080, async () => {
    console.log("Serverul a pornit pe portul 8080");
    await generateNewOffer();
    setInterval(generateNewOffer, OFFER_INTERVAL_MINUTES * 60 * 1000);
});