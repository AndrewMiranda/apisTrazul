// Configuración de las API's
const config = require("./configApis");
const fs = require('fs');

// Librerias
const pool = require("../../../config/dbConnections"+config.DBName);
const fetch = require('node-fetch');
const path = require('path');
const { handleValidationErrors } = require('../../../helpers/hasErrorsResults');
const { body, query, validationResult } = require('express-validator');
const { compareVersions, verifyApk } = require('./common/general');

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

// Origen de los pescados
controller.fishesOrigin = async(req, res) => {
    try {
        let fishesOrigin = await pool.query('SELECT fishesOrigin_id AS id, fishesOrigin_name AS name FROM `fishesOrigin`');
        fishesOrigin = JSON.parse(JSON.stringify(fishesOrigin));
    
        res.status(200).json({fishesOrigin});

    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
};

// Tipos de especies
controller.speciesTypes = async(req, res) => {
    let flag = req.query.flag;
    
    if (flag == "" || flag == undefined || flag == null) {
        res.status(400).json({error: 'El flag es obligatorio'});
    }else{
        fetch(config.apisRouteRedAzul+'/general/speciesTypes?flag='+flag, {
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
};

// Tipos de especies
controller.species = async(req, res) => {
    let flag = req.query.flag;
    let specieType  = req.query.specieType;

    let dynamicQuery = "";

    if (flag) {
        if (specieType) {
            dynamicQuery = `flag=${flag}&specieType=${specieType}`;
        }else{
            dynamicQuery = "flag="+flag;
        }
    } else {
        if (specieType) {
            dynamicQuery = `specieType=${specieType}`;
        }else{
            dynamicQuery = "";
        }
        
    }
    
    if (flag == "" || flag == undefined || flag == null) {
        res.status(400).json({error: 'El flag es obligatorio'});
    }else{
        fetch(config.apisRouteRedAzul+'/general/species?'+dynamicQuery, {
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
};

// Obtener codigos de referencia de productos (Externos o Internos)
controller.referenceCodes = [ query("id").optional().isInt(), handleValidationErrors, async(req, res) => {
    try {
        let id = req.query.id;

        if (id) {
            let data = await pool.query('SELECT referenceCodes_id AS id, referenceCodes_name AS name, referenceCodes_rule AS rule FROM `referenceCodes` WHERE referenceCodes_id = ?;', [ id ]);
            data = JSON.parse(JSON.stringify(data));

            data[0].rule = JSON.parse(data[0].rule);

            res.status(200).json({referenceCodes: data});
        } else {
            let data = await pool.query('SELECT referenceCodes_id AS id, referenceCodes_name AS name, referenceCodes_rule AS rule FROM `referenceCodes`');
            data = JSON.parse(JSON.stringify(data));

            for (let index = 0; index < data.length; index++) {
                data[index].rule = JSON.parse(data[index].rule);
            }

            res.status(200).json({referenceCodes: data});
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener unidades de peso
controller.units = [ query("id").optional().isInt(), async(req, res) => {
    try {
        // ID de la unidad
        const id = req.query.id;

        if (id) {
            let units = await pool.query('SELECT units_id AS id, units_name AS name, units_abbreviature AS abbreviature FROM `units` WHERE units_id = ?;', [ id ]);
            units = JSON.parse(JSON.stringify(units));

            res.status(200).json({units});
        } else {
            let units = await pool.query('SELECT units_id AS id, units_name AS name, units_abbreviature AS abbreviature FROM `units`;');
            units = JSON.parse(JSON.stringify(units));

            res.status(200).json({units});
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];


  /////////////////////////////////////
 // APP UPDATE AND UPDATE ENDPOINTS //
/////////////////////////////////////
controller.loadUpdate = [ body("version").notEmpty(), body("auth").notEmpty().isAlphanumeric("es-ES"), handleValidationErrors, async(req, res) => {
    try {
        // Se verifica que el token sea válido
        if (req.body.auth != "eyJzdWIiOiIxIiwibmFtZSI6IkFuZHJld01pcmFuZGEiLCJpYXQiOjE3MTExNDA0ODV9") throw "La autorización es incorrecta";

        // Se verifica que el campo apkFile se haya mandado y no sea nulo ni undefined
        if (!req.files || !req.files.apkFile) throw "El archivo es obligatorio";

        // Se verifica que el archivo sea tipo APK
        if (!verifyApk(req.files.apkFile)) throw "El archivo solo puede ser una APK";

        // Se obtiene el número de la nueva version 
        const version = req.body.version;

        // Se verifica si la versión es mayor que la versión anterior
        let actualVersion = await fetch(config.apisRoute+"/general/getLastVersion", {
            method: "GET"
        }).then(async response =>  {
            if (!response.ok) {
                error = await response.json();
    
                throw error;
            }else{
                let data = await response.json();

                return data.lastVersion;
            }
        }).catch(err => {
            throw err;
        });

        if(compareVersions(version, actualVersion) != 1) throw `La versión no puede ser menor o igual a la actual (${actualVersion})`;

        // Ruta de archivos
        const folder = './src/public/apks/trazul-' + version + '.apk';

        // Se obtiene el archivo
        const file = req.files.apkFile;

        // Se guarda el archivo en la ruta
        file.mv(folder);

        // Se registra en la BD la nueva versión de la app
        await pool.query('INSERT INTO `apkVersions`(`apkVersions_version`) VALUES (?)', [version]);

        // Se devuelve respuesta exitosa
        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

// Obtener ultima versión de la app
controller.getLastVersion = async(req, res) => {
    try {
        let lastVersion = await pool.query('SELECT apkVersions_version AS version FROM `apkVersions` WHERE apkVersions_state = 1 ORDER BY `apkVersions`.`apkVersions_id` DESC LIMIT 1;');
        lastVersion = JSON.parse(JSON.stringify(lastVersion));

        if (lastVersion.length > 0) {
            res.status(200).json({lastVersion: lastVersion[0].version});
        } else {
            res.status(400).json({error: 'No hay ninguna versión disponible'});
        }

    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}

controller.downloadUpdate = async(req, res) => {
    fetch(config.apisRoute+'/general/getLastVersion',{
        method: 'GET'
    })
    .then(async response =>  {
        if (response.status === 200) {
            let lastVersion = await response.json();
            lastVersion = lastVersion.lastVersion;
            let apkName = "trazul-"+lastVersion+".apk";

            const filePath = path.join(process.cwd(), 'src', 'public', 'apks', apkName);

            res.download(filePath);
        }else{
            res.status(response.status).json({error: response.data});
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: 'Error en consulta'});
    });
}



module.exports = controller;