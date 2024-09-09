// Configuración de repositorio
const config = require("./configRepository");

//Llamado a bibliotecas
const express = require('express');
const router = express.Router();
const path = require('path');
const pool = require("../../../config/dbConnections"+config.DBName);


//Llamado a controladores
const controller = require("../../../controllers/apis/"+config.version+"/ponds");

// Obtener estanques de un lote
router.get('/', controller.getPonds);

// Obtener tipos de estanques
router.get('/types', controller.pondsTypes);

//Se exporta el enrutador
module.exports = router;