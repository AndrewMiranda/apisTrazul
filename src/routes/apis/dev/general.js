//Llamado a bibliotecas
const express = require('express');
const router = express.Router();
const path = require('path');

// Configuración de repositorio
const config = require("./configRepository");

//Llamado a controladores
const controller = require("../../../controllers/apis/"+config.version+"/general");

// Tipos de documentos
router.get("/documentTypes", controller.documentTypes);

// Países
router.get("/countries", controller.countries);

// Regiones
router.get("/regions", controller.regions);

// Ciudades
router.get("/cities", controller.cities);

// Origen de pescados
router.get("/fishesOrigin", controller.fishesOrigin);

// Tipos de especies
router.get("/speciesTypes", controller.speciesTypes);

// Especies
router.get("/species", controller.species);

// Especies
router.get("/species", controller.species);

// Codigos de productos
router.get("/referenceCodes", controller.referenceCodes);

// Unidades de peso
router.get("/units", controller.units);

// Unidades de tipos de costos
router.get("/expensesTypes", controller.expensesTypes);


// APP UPDATE AND UPDATE ENDPOINTS
//
// APK update
router.post("/loadUpdate", controller.loadUpdate);

// APK check
router.get("/getLastVersion", controller.getLastVersion);

// Descarga de apk
router.get("/downloadUpdate", controller.downloadUpdate);
//
// END APP UPDATE AND UPDATE ENDPOINTS

//Se exporta el enrutador
module.exports = router;