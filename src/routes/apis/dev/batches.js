// Configuración de repositorio
const config = require("./configRepository");

//Llamado a bibliotecas
const express = require('express');
const router = express.Router();
const path = require('path');
const pool = require("../../../config/dbConnections"+config.DBName);


//Llamado a controladores
const controller = require("../../../controllers/apis/"+config.version+"/batches");

// Obtener lotes
router.get('/', controller.getBatches);

// Crear lote alevinera
router.post('/alevinera', controller.createBatchAlevinera);

// Generar serial para lote
router.get('/generateSerial', controller.generateSerial);


//Se exporta el enrutador
module.exports = router;