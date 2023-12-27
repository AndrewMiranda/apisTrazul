// Configuración de repositorio
const config = require("./configRepository");

//Llamado a bibliotecas
const express = require('express');
const router = express.Router();
const path = require('path');
const pool = require("../../../config/dbConnections"+config.DBName);


//Llamado a controladores
const controller = require("../../../controllers/apis/"+config.version+"/productiveUnits");


// Tipo de unidad productiva
router.get('/types', controller.productiveUnitsTypes);

// Registro de usuarios
router.post('/create', controller.createProductiveUnit);

// Tipos de estructura
router.get('/typeStructure', controller.productiveUnitTypeStructure);

// Estado de perfil de unidad productiva
router.get('/profileState', controller.profileState);

// Editar unidad productiva
router.post('/editProductiveUnit', controller.editProductiveUnit);

// Código de validación para Email
router.post('/codeEmail', controller.codeEmail);

// TEST
router.get('/test', controller.test);


//Se exporta el enrutador
module.exports = router;