// Configuración de repositorio
const config = require("./configRepository");

//Llamado a bibliotecas
const express = require('express');
const router = express.Router();
const path = require('path');
const pool = require("../../../config/dbConnections"+config.DBName);


//Llamado a controladores
const controller = require("../../../controllers/apis/"+config.version+"/users");


// Registro de usuarios
router.post('/register', controller.createUser);

// Verificación de usuarios
router.post('/verifyAcount', controller.verifyAcount);

// Terminos y condiciones
router.post('/acceptTerms', controller.acceptTerms);

// Compartir con AUNAP
router.post('/permsAunap', controller.permsAunap);

// Configurar perfil
router.post('/createProfile', controller.createProfile);

// Seleccionar tipo de usuario
router.post('/selectProfile', controller.selectProfile);

//Se exporta el enrutador
module.exports = router;