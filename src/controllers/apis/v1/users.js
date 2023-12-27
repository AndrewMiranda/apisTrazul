// Librerias
const pool = require("../../../config/dbConnections");
const fetch = require('node-fetch');
const bcrypt = require('bcrypt');
//const {sendMail} = require("../../../helpers/emails/index");
const fs = require('fs');

// Inicializadores
const {apisRoute} = require("./configApis");

// Controlador
const controller = {};