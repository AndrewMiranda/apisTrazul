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

router.get("/app/update", (req, res) => {
    const filePath = path.join(__dirname, '..', 'public', 'apks', 'app-release.apk');

    res.download(filePath);
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