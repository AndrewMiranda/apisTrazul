// Configuración de repositorio
const config = require("./configRepository");

//Llamado a bibliotecas
const express = require('express');
const router = express.Router();
const path = require('path');
const pool = require("../../../config/dbConnections"+config.DBName);


//Llamado a controladores
const controller = require("../../../controllers/apis/"+config.version+"/productiveUnits");


// Obtener unidades productivas de un usuario
router.get('/', controller.getProductiveUnits);

// Borrar unidad productivas de un usuario (Desactivar )
router.get('/delete', controller.deleteProductiveUnits);

// Tipo de unidad productiva
router.get('/types', controller.productiveUnitsTypes);

// Registro de usuarios
router.post('/create', controller.createProductiveUnit);

// Tipos de estructura
router.get('/typeStructure', controller.productiveUnitTypeStructure);

// Estado de perfil de unidad productiva
router.get('/profileState', controller.profileState);

// Código de validación para Email
router.post('/codeEmail', controller.codeEmail);

// Editar unidad productiva
router.use("/edit", require("./editProductiveUnits"));

// LOTES DE UNIDADES PRODUCTIVAS
router.use("/batches", require("./batches"));

// Obtener nombre de unidad productiva con el ID
router.get('/nameWithId', controller.nameWithId);

// Obtener nombre de unidad productiva con el ID
router.get('/nameWithIdTrazul', controller.nameWithIdTrazul);


// TEST
router.get('/test', controller.test);


//Se exporta el enrutador
module.exports = router;