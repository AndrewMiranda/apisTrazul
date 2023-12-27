// Configuración de las API's
const config = require("./configApis");

// Librerias
const pool = require("../../../config/dbConnections"+config.DBName);
const fetch = require('node-fetch');
const verifyToken = require("./../../../helpers/auth");

// Controlador
const controller = {};

controller.countries = [ verifyToken(config), async(req, res) =>{
    let idCountry = req.query.id;

    if (idCountry) {
        dinamycId = "?id="+idCountry;
    } else {
        dinamycId = "";
    }

    fetch(config.apisRouteRedAzul+'/general/countries'+dinamycId, {
        method: 'GET',
        headers: {"Authorization": config.authRedAzul}
    })
    .then(async response =>  {
        if (response.status === 200) {
            res.status(200).json(await response.json());
        }else{
            res.status(response.status).json({error: response.data});
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: 'Error en consulta'});
    });    
}];



module.exports = controller;