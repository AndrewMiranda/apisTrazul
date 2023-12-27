// Configuración de las API's
const config = require("./configApis");

// Librerias
const pool = require("../../../config/dbConnections"+config.DBName);
const fetch = require('node-fetch');

// Controlador
const controller = {};

controller.countries = [ async(req, res) => {
    let id = req.query.id;

    if (id) {
        id = "id="+id;
    } else {
        id = "";
    }


    fetch(config.apisRouteRedAzul+'/general/countries?'+id, {
        method: 'GET',
        headers: {
            'Authorization': config.authRedAzul
        }
    })
    .then(async response =>  {
        if (response.status === 200) {
            res.status(200).json(await response.json());
        }else{
            res.status(response.status).json(await response.json());
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: 'Error en consulta'});
    });
}];

controller.regions = [ async(req, res) => {
    let id = req.query.id;
    let country = req.query.country;

    let dynamicQuery = "";

    if (id) {
        if (country) {
            dynamicQuery = `id=${id}&country=${country}`;
        }else{
            dynamicQuery = "id="+id;
        }
    } else {
        if (country) {
            dynamicQuery = `country=${country}`;
        }else{
            dynamicQuery = "";
        }
        
    }

    fetch(config.apisRouteRedAzul+'/general/regions?'+dynamicQuery , {
        method: 'GET',
        headers: {
            'Authorization': config.authRedAzul
        }
    })
    .then(async response =>  {
        if (response.status === 200) {
            res.status(200).json(await response.json());
        }else{
            res.status(response.status).json(await response.json());
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: 'Error en consulta'});
    });
}];

controller.cities = [ async(req, res) => {
    let id = req.query.id;
    let region = req.query.region;

    let dynamicQuery = "";

    if (id) {
        if (region) {
            dynamicQuery = `id=${id}&region=${region}`;
        }else{
            dynamicQuery = "id="+id;
        }
    } else {
        if (region) {
            dynamicQuery = `region=${region}`;
        }else{
            dynamicQuery = "";
        }
        
    }

    fetch(config.apisRouteRedAzul+'/general/cities?'+dynamicQuery , {
        method: 'GET',
        headers: {
            'Authorization': config.authRedAzul
        }
    })
    .then(async response =>  {
        if (response.status === 200) {
            res.status(200).json(await response.json());
        }else{
            res.status(response.status).json(await response.json());
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: 'Error en consulta'});
    });
}];

controller.documentTypes = async(req, res) => {
    let flag = req.query.flag;
    
    if (flag == "" || flag == undefined || flag == null) {
        res.status(400).json({error: 'El flag es obligatorio'});
    }else{
        fetch(config.apisRouteRedAzul+'/general/documentTypes?flag='+flag, {
            method: 'GET',
            authorization: config.authRedAzul
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
    }  
}



module.exports = controller;