//Llamado a bibliotecas
const express = require('express');
const router = express.Router();
const path = require('path');

// Configuración de repositorio
const config = require("./configRepository");

//Llamado a controladores
const controller = require("../../../controllers/apis/"+config.version+"/index");


//Se exporta el enrutador
module.exports = router;