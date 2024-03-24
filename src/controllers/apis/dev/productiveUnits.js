// Configuración de las API's
const config = require("./configApis");

// Librerias
const pool = require("../../../config/dbConnections"+config.DBName);
const fetch = require('node-fetch');
const verifyToken = require("./../../../helpers/auth");
const { genRandomNumberCode, generateRandomHash } = require('../../../helpers/randomString');
const validate = require('../../../helpers/validator/postValidator');
const { body, query, validationResult } = require('express-validator');
const { handleValidationErrors } = require('../../../helpers/hasErrorsResults');
const {sendMail} = require("../../../helpers/emails/index");
const { validProductiveUnitType, getUserId, userOwnerProductiveUnit, getUserHash } = require('./common/productiveUnitsEdit.js');


// Controlador
const controller = {};

// Tipo de unidades productivas
controller.getProductiveUnits = [verifyToken(config), async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);

        let productiveUnits = await pool.query('SELECT productiveUnits_id AS id, JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(productiveUnits_body, "$.profile.informacionAlevinera")), "$.name")) AS name, JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(productiveUnits_body, "$.profile.informacionAlevinera")), "$.logo")) AS logo, JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(productiveUnits_body, "$.profile.informacionAlevinera")), "$.municipality")) AS municipality, productiveUnits_types_id AS type FROM `productiveUnits` WHERE users_id = ? AND productiveUnits_state = 1', [ userId ]);
        productiveUnits = JSON.parse(JSON.stringify(productiveUnits));

        for (let index = 0; index < productiveUnits.length; index++) {
            const element = productiveUnits[index];

            if (element.municipality != null) {        
                // Se consulta el departamento según el id del municipio
                let location = await fetch(config.apisRouteRedAzul+"/general/location?municipality="+element.municipality, {method: 'GET'})
                .then(async response =>  {
                    if (response.status === 200) {
                        return await response.json();
                    }
                })
                .catch(err => {
                    console.log(err);
                    throw "Error en consulta de ubicación";
                });

                element.municipality = location.location;
            }

            element.perms = true;
        }

        // Se verifica a que granjas pertenece el usuario como personal de trazabilidad
        let productiveUnitsStaff = await pool.query('SELECT b.productiveUnits_id AS id, JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(b.productiveUnits_body, "$.profile.informacionAlevinera")), "$.name")) AS name, JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(b.productiveUnits_body, "$.profile.informacionAlevinera")), "$.logo")) AS logo, JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(b.productiveUnits_body, "$.profile.informacionAlevinera")), "$.municipality")) AS municipality, b.productiveUnits_types_id AS type, a.traceabilityStaff_perms AS perms FROM `traceabilityStaff` AS a LEFT JOIN productiveUnits AS b ON b.productiveUnits_id = a.productiveUnits_id WHERE a.users_id = ? AND a.traceabilityStaff_state = 1 AND b.productiveUnits_state = 1', [ userId ]);

        productiveUnitsStaff = JSON.parse(JSON.stringify(productiveUnitsStaff));

        for (let index = 0; index < productiveUnitsStaff.length; index++) {
            const element = productiveUnitsStaff[index];

            if (element.municipality != null) {   
                // Se consulta el departamento según el id del municipio
                let location = await fetch(config.apisRouteRedAzul+"/general/location?municipality="+element.municipality, {method: 'GET'})
                .then(async response =>  {
                    if (response.status === 200) {
                        return await response.json();
                    }
                })
                .catch(err => {
                    console.log(err);
                    throw "Error en consulta de ubicación";
                });

                element.municipality = location.location;
            }

            // Se parsean los permisos
            perms = JSON.parse(element.perms);

            hasEditPerms = false;

            for (let index = 0; index < perms.length; index++) {
                let element = perms[index];

                if (element == "all" || element == "modifyProductiveUnit") {
                    hasEditPerms = true;
                }
            }

            element.perms = hasEditPerms;
        }

        // Se combinan las consultas
        productiveUnits = productiveUnits.concat(productiveUnitsStaff);

        res.status(200).json({productiveUnits});
    } catch (error) {
        console.error(error);
        res.status(400).json({error});
    }
}];

// Tipo de unidades productivas
controller.productiveUnitsTypes = async(req, res) => {
    try {
        let usersTypes = await pool.query('SELECT productiveUnits_types_id AS id, productiveUnits_types_name AS name, JSON_EXTRACT(productiveUnits_types_body, "$.images") AS images,JSON_EXTRACT(productiveUnits_types_body, "$.widgetRedirect") AS widgetRedirect FROM `productiveUnits_types` WHERE productiveUnits_types_state = 1;');
        usersTypes = JSON.parse(JSON.stringify(usersTypes));

        // Se parsea el Array de imagenes y la redirección de widget
        usersTypes.forEach(element => {
            // Parse de imagenes
            let images = element.images;

            images = JSON.parse(images);

            element.images = images;

            // Parseo de redirección
            let widgetRedirect = element.widgetRedirect;

            widgetRedirect = JSON.parse(widgetRedirect);

            element.widgetRedirect = widgetRedirect;
        });

        res.status(200).json({usersTypes});
    } catch (error) {
        console.error(error);
        res.status(400).json({error});
    }
}

// Borrar unidad productiva
controller.deleteProductiveUnits = [ verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS GET
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId)) throw `Esta unidad productiva no pertenece a este usuario.`;

        await pool.query('UPDATE `productiveUnits` SET `productiveUnits_state`= 0 WHERE `productiveUnits_id` = ?', [ productiveUnitId ]);

        res.status(200).json({});
    } catch (error) {
        console.error(error);
        res.status(400).json({error});
    }
}];

// Crear unidad productiva
controller.createProductiveUnit = [ verifyToken(config), body("productiveUnitType").isInt(), handleValidationErrors, async(req, res) => {

    // Datos del POST
    let productiveUnitType = req.body.productiveUnitType;
    let userToken = req.headers['authorization'];

    try {
        // Se recupera el ID del usuario con el token de la sesión
        let userData = await pool.query('SELECT * FROM `users_sessions` AS a LEFT JOIN users AS b ON b.users_id = a.users_id WHERE users_sessions_code = ?;', [userToken]);
        userData = JSON.parse(JSON.stringify(userData));

        // ID del usuario
        const userId = userData[0].users_id;

        let unitTypeValid = await pool.query('SELECT * FROM `productiveUnits_types` WHERE productiveUnits_types_id = ? AND productiveUnits_types_state = 1', [ productiveUnitType ]);

        if (unitTypeValid.length > 0) {
            await pool.query('INSERT INTO `productiveUnits`(`users_id`, `productiveUnits_types_id`) VALUES (?, ?)', [userId, productiveUnitType]);

            let productiveUnit = await pool.query('SELECT * FROM `productiveUnits` WHERE users_id = ? ORDER BY `productiveUnits`.`productiveUnits_date` DESC ', [userId]);
            productiveUnit = JSON.parse(JSON.stringify(productiveUnit));

            productiveUnitId = productiveUnit[0].productiveUnits_id;

            res.status(200).json({productiveUnitId});
        } else {
            res.status(400).json({error: 'Tipo de unidad productiva no valida'});
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Estructura del tipo de unidad productiva
controller.productiveUnitTypeStructure = [ query("productiveUnitType").isInt(), async(req, res) => {
    try {
        // Datos GET
        const productiveUnitType = req.query.productiveUnitType;

        let productiveUnitTypeValid = await pool.query('SELECT JSON_EXTRACT(productiveUnits_types_body, "$.structure") AS structure FROM `productiveUnits_types` WHERE productiveUnits_types_id = ?', [productiveUnitType]);
        productiveUnitTypeValid = JSON.parse(JSON.stringify(productiveUnitTypeValid));

        if (productiveUnitTypeValid.length > 0) {
            // Se obtiene y se parsea la estructura sel tipo de unidad
            let structure = productiveUnitTypeValid[0].structure;
            structure = JSON.parse(structure);
            

            res.status(200).json({structure});
        } else {
            res.status(400).json({error: 'Tipo de unidad productiva no valida'});
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Estructura del tipo de unidad productiva
controller.profileState = [ verifyToken(config), query("productiveUnitId").isInt(), async(req, res) => {
    try {
        // Datos GET
        const productiveUnit = req.query.productiveUnitId;

        // Se obtiene el perfil y el tipo de la unidad productiva
        let productiveUnitProfile = await pool.query('SELECT productiveUnits_body AS body, productiveUnits_types_id AS type FROM `productiveUnits` WHERE productiveUnits_id = ?', [productiveUnit]);
        productiveUnitProfile = JSON.parse(JSON.stringify(productiveUnitProfile));

        // Se verifica que si existe la unidad productiva
        if (productiveUnitProfile.length > 0) {
            // Se obtiene la estructura del tipo de unidad productiva
            let productiveUnitTypeStructure = await pool.query('SELECT JSON_EXTRACT(productiveUnits_types_body, "$.structure") AS structure FROM `productiveUnits_types` WHERE productiveUnits_types_id = ?', [productiveUnitProfile[0].type]);
            productiveUnitTypeStructure = JSON.parse(JSON.stringify(productiveUnitTypeStructure));

            // Se parsea el JSON con la estructura de la unidad productiva
            productiveUnitTypeStructure = JSON.parse(productiveUnitTypeStructure[0].structure);

            // Se obtiene y se parsea el JSON con el perfil de la unidad productiva
            productiveUnitProfile = JSON.parse(productiveUnitProfile[0].body);

            if (productiveUnitProfile != null) {
                productiveUnitProfile = productiveUnitProfile.profile;
            }

            // Objeto donde se guarda el progreso de registro
            let state = {};

            // Se verifica el estado de registro del perfil
            productiveUnitTypeStructure.forEach(element => {
                if (productiveUnitProfile == null) {
                    state[element.id] = false;
                } else {
                    if (Object.hasOwn(productiveUnitProfile, element.id)) {
                        state[element.id] = true;
                    } else {
                        state[element.id] = false;
                    }
                }
            });

            res.status(200).json({state});
        } else {
            res.status(400).json({error: 'La unidad productiva no existe'});
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Editar perfil de tipo de unidad productiva
controller.editProductiveUnit = [ body("productiveUnitId").isInt(), async(req, res) => {
    try {
        // Datos POST
        const productiveUnitID = req.body.productiveUnitId;
        const idProfileData = req.body.idGroupData;

        const codeUser = req.headers['authorization'];

        let userId = await pool.query('SELECT users_id AS id FROM `users_sessions` WHERE users_sessions_code = ?', [ codeUser ]);
        userId = JSON.parse(JSON.stringify(userId));

        userId = userId[0].id;

        if (idProfileData == undefined || idProfileData == null) {
            res.status(400).json({error: 'El ID del grupo de datos es obligatorio'});
        } else {
            // Se consulta la unidad productiva
            let productiveUnit = await pool.query('SELECT * FROM `productiveUnits`WHERE productiveUnits_id = ? AND users_id = ?', [ productiveUnitID, userId ]);
            productiveUnit = JSON.parse(JSON.stringify(productiveUnit));

            if (productiveUnit.length > 0) {
                // Se obtiene el ID de tipo de unidad productiva
                let productiveUnitType = productiveUnit[0].productiveUnits_types_id;

                // Se consulta y se obtiene el tipo de unidad productiva
                let groupData = await pool.query('SELECT JSON_EXTRACT(productiveUnits_types_body, "$.structure") AS structure FROM productiveUnits_types WHERE productiveUnits_types_id = ?', [productiveUnitType]);
                groupData = JSON.parse(JSON.stringify(groupData));

                if (groupData.length > 0) {
                    // Se parsea el JSON de la estructura
                    groupData = JSON.parse(groupData[0].structure);

                    // Objeto que guarda la estuctura del grupo de datos
                    let groupDataStructure;

                    groupData.forEach(element => {
                        if (element.id == idProfileData) {
                            groupDataStructure = element.structure;
                        }
                    });

                    console.log(groupDataStructure);

                    if (groupDataStructure == undefined) {
                        res.status(400).json({error: 'ID de grupo no válido'});
                    } else {
                        let postData = {};

                        // Se itera para obtener los datos POST segun la estructura
                        for (const element of groupDataStructure) {
                            // Se declara data
                            let data;

                            // Nombre del dato en la estructura
                            let name = element.name;

                            // Se verifica si el tipo de dato es image, files o multipleFile (Manejo especial)
                            if (element.type == "image" || element.type == "file" || element.type == "multipleFile") {

                                // Se verifica si es obligatorio el dato y si se envió
                                if (element.required == true && !req.files && !req.files[name]) {
                                    throw name+" es obligatorio";
                                } else {
                                    console.log(req.files);
                                    if (req.files && req.files[name]) {
                                        data = req.files[name];
                                    }

                                    data = await validate(config, element.type, data, element.required);
        
                                    if (data == undefined) {
                                        data = null;   
                                    }

                                    postData[name] = data;
    
                                }
                            } else {
                                // Se obtiene el dato
                                data = req.body[name];

                                // Se verifica si es obligatorio el dato
                                if (!data && element.required == true) {
                                    throw name+" es obligatorio";
                                } else {

                                    data = await validate(config, element.type, data, element.required);
    
                                    if (data == undefined) {
                                        data = null;   
                                    }
    
                                    postData[name] = data;
                                }
                            }
                        };

                        postData = JSON.stringify(postData);

                        await pool.query(`UPDATE productiveUnits SET productiveUnits_body = JSON_SET(productiveUnits_body, '$.profile.${idProfileData}', '${postData}') WHERE productiveUnits_id = ?`, [ productiveUnitID ]);

                        res.status(200).json({});
                    }
                } else {
                    res.status(400).json({error: 'Tipo de unidad productiva no válida'});
                }
            } else {
                res.status(400).json({error: 'La unidad productiva no existe'});
            }
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Validar email para unidad productiva
controller.codeEmail = [ async(req, res) => {
    try {
        // Se genera el código aleatorio
        verificationCode = genRandomNumberCode(6);

        // DATO POST
        let email = req.body.email;

        if (email == undefined || email == null || email == "") {
            res.status(400).json({error: 'El email es obligatorio'});
        } else {
            // Regex de email
            var regExp = /\S+@\S+\.\S+/;

            if (regExp.test(email)) {
                await pool.query('INSERT INTO `productiveUnits_emails`(`productiveUnits_emails_email`, `productiveUnits_emails_code`) VALUES (?, ?)', [ email, verificationCode ]);

                verificationCode = config.apisRoute+verificationCode;

                sendMail(email, "Código de verificación de unidad productiva - Trazul", {email: email, verifyCode: verificationCode}, "verifyCodeProductiveUnit");

                res.status(200).json({});
            } else {
                res.status(400).json({error: 'Email no válido'});
            }
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

// Obtener nombre de unidad productiva con el ID
controller.nameWithId = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // Datos GET
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId)) throw `Esta unidad productiva no pertenece a este usuario.`;

        let productiveUnitData = await pool.query('SELECT JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(productiveUnits_body, "$.profile.informacionAlevinera")), "$.name")) AS name FROM `productiveUnits` WHERE productiveUnits_id = ?', [ productiveUnitId ]); 
        productiveUnitData = JSON.parse(JSON.stringify(productiveUnitData));
        
        res.status(200).json({"name": productiveUnitData[0].name});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener nombre de unidad productiva con el ID
controller.nameWithIdTrazul = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // Datos GET
        const productiveUnitId = req.query.productiveUnitId;

        // Se obtienen los datos de la unidad productiva
        let productiveUnitData = await pool.query('SELECT JSON_EXTRACT(productiveUnits_body, "$.profile") AS body, productiveUnits_types_id AS type FROM `productiveUnits` WHERE productiveUnits_id = ?', [ productiveUnitId ]);
        productiveUnitData = JSON.parse(JSON.stringify(productiveUnitData));

        let productiveUnitName = "";
        let type = productiveUnitData[0].type;

        productiveUnitData = JSON.parse(productiveUnitData[0].body);

        // Se itera el body dependiendo del type para obtener el nombre de la unidad productiva
        switch (type) {
            case 1:
                productiveUnitName = JSON.parse(productiveUnitData.informacionAlevinera).name;
                break;
            case 2:
                productiveUnitName = JSON.parse(productiveUnitData.informacionEngorde).name;
                break;
            default:
                productiveUnitName = null;
                break;
        }
        
        res.status(200).json({"name": productiveUnitName, "type":type});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// TEST
controller.test = [ async(req, res) => {
    let data = await pool.query('SELECT productiveUnits_body AS body FROM `productiveUnits` WHERE productiveUnits_id = 1; ');
    data = JSON.parse(JSON.stringify(data));

    console.log(data);

    let dataTest = data[0].body;

    dataTest = JSON.parse(dataTest);
    
    dataTest = dataTest.profile.informacionAlevinera;
    
    dataTest = JSON.parse(dataTest);

    console.log(dataTest);

    res.status(200).json({dataTest});
}]

module.exports = controller;