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

// Código de validación para Email
router.post('/codeEmailVerification', controller.codeEmailVerification);

// Obtener nombre de unidad productiva con el ID
router.get('/nameWithId', controller.nameWithId);

// Obtener nombre de unidad productiva con el ID
router.get('/nameWithIdTrazul', controller.nameWithIdTrazul);

// Buscador de unidades productivas según nombre o documento
router.get('/search', controller.nameWithIdTrazul);

// Buscador de unidades productivas según nombre o documento
router.get('/searcher', controller.searcher);

// Obtener modulos de una unidades productivas según permisos del usuario
router.get('/modules', controller.modules);

// RUTA DE COSTOS
router.get('/expenses', controller.expenses);

router.post('/expenses', controller.addExpenses);

// RUTA DE INGRESOS
router.get('/incomes', controller.incomes);

router.post('/incomes', controller.addIncomes);



// INICIO DE RUTAS EXTERNAS

// Editar unidad productiva
router.use("/edit", require("./editProductiveUnits"));

// ESTANQUES DE UNIDAD PRODUCTIVA
router.use("/ponds", require("./ponds"));

// LOTES DE UNIDADES PRODUCTIVAS
router.use("/batches", require("./batches"));

// FIN DE RUTAS EXTERNAS


// TEST
router.get('/test', controller.test);


//Se exporta el enrutador
module.exports = router;