//Llamado a bibliotecas
const express = require('express');
const router = express.Router();
const path = require('path');

// Versión de Desarrollo
router.use('/dev', require('./dev/index.js'));

// Versión 1.0.0 de las API's
router.use('/v1', require('./v1/index.js'));

//Se exporta el enrutador
module.exports = router;