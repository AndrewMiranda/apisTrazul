//Llamado a bibliotecas
const express = require('express');
const router = express.Router();
const path = require('path');

// Configuración de repositorio
const config = require("./configRepository");

//Llamado a controladores
const controller = require("../../../controllers/apis/"+config.version+"/index");

// User Resources
//router.use("/users", require("./users"));

// General Resources
router.use("/general", require("./general"));


//Se exporta el enrutador
module.exports = router;