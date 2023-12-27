// Librerias
const sharp = require('sharp');
const fetch = require('node-fetch');

// Inicializadores
const {apisRoute} = require("./configApis");

// Controlador
const controller = {};

// HOME
controller.home = async(req, res) => {
    res.status(401).json({error: 'No estás autorizado para acceder a esta página.'});
}

// Se exporta el controllador
module.exports = controller;