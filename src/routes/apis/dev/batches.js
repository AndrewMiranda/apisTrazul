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

// Obtener Tipos de estados iniciales
router.get('/initialStates', controller.initialStates);

// Crear lote alevinera
router.post('/alevinera', controller.createBatchAlevinera);

// Crear lote alevinera derivado
router.post('/alevineraDerivative', controller.createBatchAlevineraDerivative);

// Crear lote alevinera derivado
router.post('/alevineraMixed', controller.createBatchAlevineraMixed);

// Editar lote alevinera
// router.put('/alevineraMixed', controller.createBatchAlevineraMixed);

// Crear lote engorde
router.post('/engorde', controller.createBatchEngorde);

// Crear lote alevinera derivado
router.post('/engordeDerivative', controller.engordeDerivative);

// Crear lote alevinera derivado
router.post('/engordeMixed', controller.engordeMixed);

// Generar serial para lote
router.get('/generateSerial', controller.generateSerial);

// Asociar estanque a un lote
router.post('/:id/pond', controller.associatePond);

// Asociar pienso a un lote
router.post('/:id/feed', controller.associateFeed);

// Asociar medicamento a un lote
router.post('/:id/medicine', controller.associateMedicine);

// Asociar insumo a un lote
router.post('/:id/supply', controller.associateSupply);

// Obtener registro de mortalidad de un lote
router.post('/:id/mortality', controller.addMortality);

// Asociar insumo a un lote
router.post('/:id/biomass', controller.addBiomass);

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

// Asociar ingreso a lote
router.post('/incomes', controller.associateIncomes);

router.get('/incomes', controller.incomes);

// Asociar costo a lote
router.post('/expenses', controller.associateExpenses);

router.get('/expense', controller.expenses);

// Asociar egreso a lote
// router.post('/expenses', controller.aquacode);


//Se exporta el enrutador
module.exports = router;