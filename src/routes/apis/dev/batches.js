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

// Obtener lote especifico
router.get('/specific', controller.getBatch);

// Crear lote alevinera
router.post('/alevinera', controller.createBatchAlevinera);

// Crear lote alevinera derivado
router.post('/alevineraDerivative', controller.createBatchAlevineraDerivative);

// Crear lote alevinera derivado
router.post('/alevineraMixed', controller.createBatchAlevineraMixed);

// Crear lote engorde
router.post('/engorde', controller.createBatchEngorde);

// Crear lote alevinera derivado
router.post('/engordeDerivative', controller.engordeDerivative);

// Crear lote alevinera derivado
router.post('/engordeMixed', controller.engordeMixed);

// Generar serial para lote
router.get('/generateSerial', controller.generateSerial);

// Obtener embalajes
router.get('/packaging', controller.packaging);

// Obtener historial de transportadores
router.get('/shippersHistory', controller.shippersHistory);

// Obtener historial de transportadores
router.get('/customersHistory', controller.customersHistory);

// Crear despacho
router.post('/dispatch', controller.dispatch);

// Obtener despachos
router.get('/dispatches', controller.dispatches);

// Obtener despacho especifico
router.get('/dispatch', controller.specificDispatch);

// Obtener despacho especifico
router.get('/traceability', controller.traceability);

// Obtener despacho especifico
router.get('/acuacode', controller.aquacode);


//Se exporta el enrutador
module.exports = router;