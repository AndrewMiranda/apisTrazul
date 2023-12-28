// Configuración de las API's
const { body } = require("express-validator");
const config = require("./configApis");
const fs = require('fs');

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

controller.update =[ async(req, res) => {
    try {
        // const file = req.file.apkUdate;
        // console.log(req.files);
        const version = req.body.versionApkUpdate;
        const rutaArchivoDestino = './src/public/apks/trazul-' + version + '.apk';
        if (!req.files) {
            // console.log(file);
            res.status(400).json({error: 'El archivo APK es obligatorio'});
        } else {
            // console.log(req.files.apkUdate);
            
            const archivo = req.files.apkUdate;
            fs.writeFileSync(rutaArchivoDestino, archivo.data);
            await pool.query('INSERT INTO `apkVersions`(`apkVersions_version`) VALUES (?)', [version])
            res.status(200).json({});
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

module.exports = controller;