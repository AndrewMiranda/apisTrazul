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

// Reenviar código de verificación
router.get('/resendCodeVerification', controller.resendCodeVerification);

// Editar perfil
router.post('/editProfile', controller.editProfile);

// Seleccionar tipo de usuario
router.post('/selectProfile', controller.selectProfile);

// Obtener datos de un usuario
router.get('/data', controller.getUserData);

// Obtener datos de un usuario
router.get('/otherData', controller.getOtherUserData);

// Obtener datos de un usuario
router.get('/dataWithEmail', controller.getUserDataWithEmail);

// Deslogueo de usuario
router.get('/logout', controller.logout);

// Revisar invitaciones de trazabilidad pendientes
router.get('/hasStaffInvitations', controller.hasStaffInvitations);

// Aceptar invitación de trazabilidad
router.get('/acceptStaffInvitations', controller.acceptStaffInvitations);

// Revisar invitación de trazabilidad
router.get('/rejectStaffInvitations', controller.rejectStaffInvitations);

// Aceptar invitación de Staff de trazabilidad
router.get('/acceptStaffEmail', controller.acceptStaffEmail);

// Rechazar invitación de Staff de trazabilidad
router.get('/rejectStaffEmail', controller.rejectStaffEmail);


//Se exporta el enrutador
module.exports = router;