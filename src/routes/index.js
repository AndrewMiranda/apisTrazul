/*
 * Archivo principal de rutas
 * Fecha: 13/11/2023
*/

//Llamado a bibliotecas
const express = require('express');
const router = express.Router();
const path = require('path');

//Llamado a rutas
router.use('/apis', require('./apis/apis.js'));

// WEB
router.get("/", (req, res) => {
    res.send("Bienvenido a TRAZUL");
});

// Ruta para subir update de trazul (Temporal)
router.get("/update", (req, res) => {
    // Se obtiene la versión actual de las API's
    const apisVersion = process.env.ACTUALAPIVERSION || "dev";
    res.render("update/update.ejs", { apisVersion });
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

module.exports = router;