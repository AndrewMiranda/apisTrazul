/*
 * Archivo principal de rutas
 * Fecha: 13/11/2023
*/

//Llamado a bibliotecas
const express = require('express');
const router = express.Router();
const path = require('path');

// Ruta para subir update de trazul (Temporal)
router.get("/update", (req, res) => {
    // Se obtiene la versión actual de las API's
    const apisVersion = process.env.ACTUALAPIVERSION || "dev";
    res.render("update/update.ejs", { apisVersion });
});

// Ruta para consultar trazabilidad
router.get("/acuacode", (req, res) => {
    // Se obtiene la versión actual de las API's
    const apisVersion = req.query.v || process.env.ACTUALAPIVERSION || "dev";

    // Se obtiene el host
    const host = process.env.URLAPI || "http://localhost:3000";

    const urlApi = host+"/apis/"+apisVersion;

    // Se obtiene el código en caso de que sea una redirección
    const code = req.query.c ?? "";

    res.render("update/acuacode.ejs", { urlApi, code });
});

router.get("/acuacode/:code", (req, res) => {
    const { code }  = req.params; // Obtiene el valor dinámico de la URL2

    // Se obtiene la versión actual de las API's
    const apisVersion = req.query.v || process.env.ACTUALAPIVERSION || "dev";

    // Se obtiene el host
    const host = process.env.URLAPI || "http://localhost:3000";

    const urlApi = host+"/apis/"+apisVersion;

    res.render("update/acuacodeDescription.ejs", { urlApi, code });
});


// Favicon
router.get("/favicon.ico", (req, res) => { 
    res.sendFile("src/public/favicon/favicon.ico", { root: '.' })
});

router.get("/apple-touch-icon.png", (req, res) => { 
    res.sendFile("src/public/favicon/favicon.ico", { root: '.' })
});

router.get("/favicon-32x32.png", (req, res) => { 
    res.sendFile("src/public/favicon/favicon.ico", { root: '.' }) 
});

router.get("/favicon-16x16.png", (req, res) => { 
    res.sendFile("src/public/favicon/favicon.ico", { root: '.' }) 
});

router.get("/site.webmanifest", (req, res) => { 
    res.sendFile("src/public/favicon/favicon.ico", { root: '.' }) 
});

router.get("/safari-pinned-tab.svg", (req, res) => { 
    res.sendFile("src/public/favicon/favicon.ico", { root: '.' }) 
});

//Llamado a rutas
router.use('/apis', require('./apis/apis.js'));
router.use('/', require('./web/web.js'));

module.exports = router;