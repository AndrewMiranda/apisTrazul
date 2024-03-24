// Configuración de repositorio
const config = require("./configRepository");

//Llamado a bibliotecas
const express = require('express');
const router = express.Router();
const path = require('path');
const pool = require("../../../config/dbConnections"+config.DBName);


//Llamado a controladores
const controller = require("../../../controllers/apis/"+config.version+"/productiveUnitsEdit");

// // // // // // // // // // // // // ////
// INICIO DE RUTAS PERFIL DE ALEVINEROS //
// // // // // // // // // // // // // //

/*
-----------------------
- Información general -
-----------------------
*/

// Crear o editar información de alevinera
router.post('/informacionAlevinera', controller.informacionAlevinera);

// Obtener datos de información de alevinera
router.get('/informacionAlevinera', controller.getInformacionAlevinera);


/*
---------------------------
| Información de padrotes |
---------------------------
*/

// Obtener padrotes de una alevinera
router.get('/informacionPadrotesAlevinera', controller.informacionPadrotesAlevinera);

// Obtener información de un padrote de una alevinera
router.get('/specificBroodstock', controller.specificBroodstock);

// Crear un padrote en una alevinera
router.post('/informacionPadrotesAlevinera', controller.createPadrotesAlevinera);

// Crear un padrote en una alevinera
router.put('/informacionPadrotesAlevinera', controller.editPadrotesAlevinera);


/*
-------------------------------
- Información de bioseguridad -
-------------------------------
*/

// Obtener información de bioseguridad de una alevinera
router.get('/informacionBioseguridadAlevinera', controller.getInformacionBioseguridadAlevinera);

// Cargar certificado de bioseguridad
router.post('/informacionBioseguridadAlevinera', controller.editInformacionBioseguridadAlevinera);

// Cargar certificado de bioseguridad
router.post('/biosecurityLinkAfter', controller.biosecurityLinkAfter);


/*
----------------------
- Lotes de alevinera -
----------------------
*/

// Obtener especies que tiene agregada la alevinera
router.get('/lotes/alevinera/species', controller.loteAlevineraSpecies);

// Obtener padrotes de la alevinera
router.get('/lotes/alevinera/padrotes', controller.loteAlevineraPadrotes);






// // // // // // // // // // // // ////
// FIN DE RUTAS PERFIL DE ALEVINEROS //
// // // // // // // // // // // // //

// // // // // // // // // // // // // ///
// INICIO DE RUTAS GENERALES DE PERFIL //
// // // // // // // // // // // // ////

// Crear estanque de unidad productiva
router.post('/addPond', controller.addPonds);

// Editar estanque de unidad productiva
router.post('/editPond', controller.editPonds);

// Eliminar estanque de unidad productiva
router.post('/deletePond', controller.deletePonds);

// Crear medicamentos
router.post('/medicine', controller.addMedicine);

// Obtener medicamentos de una unidad productiva
router.get('/medicine', controller.getMedicines);

// Eliminar medicamentos de una unidad productiva
router.post('/deleteMedicine', controller.deleteMedicine);

// Descontinuar medicamentos de una unidad productiva
router.post('/editMedicine', controller.editMedicine);

// Vincular piensos después
router.post('/feedLinkAfter', controller.feedLinkAfter); 

// Crear pienso
router.post('/feed', controller.createFeed);

// Obtener piensos
router.get('/feed', controller.getFeeds); 

// Descontinuar piensos
router.get('/deleteFeed', controller.deleteFeed); 

// Obtener pienso especifico
router.get('/specificFeed', controller.getEspecifiFeed);

// Agregar permiso de unidad productiva
router.post('/permit', controller.addPermit);

// Editar permiso de unidad productiva
router.put('/permit', controller.editPermit);

// Obtener permisos de unidad productiva
router.get('/permit', controller.getPermit);

// Vincular permisos después
router.post('/permitLinkAfter', controller.permitLinkAfter);

// Obtener certficados de unidad productiva
router.get('/certificates', controller.getCertificates);

// Agregar certficado a una unidad productiva
router.post ('/certificates', controller.addCertificate);

// Vincular certificados después
router.post('/certificatesLinkAfter', controller.certificatesLinkAfter);

// Obtener personal de trazabilidad
router.get('/traceabilityStaff', controller.traceabilityStaff);

// Crear personal de trazabilidad
router.post('/traceabilityStaff', controller.addTraceabilityStaff);

// Eliminar personal de trazabilidad
router.post('/deleteTraceabilityStaff', controller.deleteTraceabilityStaff);

// Eliminar personal de trazabilidad
router.post('/editTraceabilityStaff', controller.editTraceabilityStaff);


// // // // // // // // // // // // ///
// FIN DE RUTAS GENERALES DE PERFIL //
// // // // // // // // // // // ////



//Se exporta el enrutador
module.exports = router;