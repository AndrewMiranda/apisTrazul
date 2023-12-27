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

//Se exporta el enrutador
module.exports = router;