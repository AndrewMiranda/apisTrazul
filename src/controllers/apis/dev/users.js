// Configuración de las API's
const config = require("./configApis");

// Librerias
const pool = require("../../../config/dbConnections"+config.DBName);
const fetch = require('node-fetch');
const verifyToken = require("./../../../helpers/auth");
const { genRandomNumberCode, generateRandomHash } = require('../../../helpers/randomString');
const { body, query, validationResult } = require('express-validator');

// Controlador
const controller = {};


// Crear usuario
controller.createUser = [ async(req, res) => {
    // Datos del POST
    let email = req.body.email;
    let password = req.body.password;
    let confirmPassword = req.body.confirmPassword;
    let profileType  = req.body.profileType ;

    fetch(config.apisRouteRedAzul+'/users/register', {
        method: 'POST',
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, password, confirmPassword, profileType , serviceKey: config.trazulKey })
    })
    .then(async response =>  {
        if (response.status === 200) {
            let data = await response.json();

            userHash = data.code;

            await pool.query('INSERT INTO `users`(`users_code`) VALUES (?)', [userHash]);

            let userData = await pool.query('SELECT `users_id` AS id FROM `users` WHERE `users_code` = ?', [userHash]);
            userData = JSON.parse(JSON.stringify(userData));

            let userId = userData[0].id;

            // Se crea el código HASH del usuario para la sesión
            sessionHash = generateRandomHash(32);

            await pool.query('INSERT INTO `users_sessions`(`users_id`, `users_sessions_code`) VALUES (?, ?)', [userId, sessionHash]);

            res.status(200).json({code: sessionHash});
        }else{
            let data = await response.json();
            res.status(response.status).json({error: data});
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
}];

// Verificación de usuario
controller.verifyAcount = [ verifyToken(config), body("code").notEmpty(), async(req, res) => {
    // Manejar inputs
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const error = result.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        console.log(error);
        return res.status(400).json({ error });
    }

    // Datos del POST
    let code = req.body.code;
    let userToken = req.headers['authorization'];

    // Se recupera el hash del usuario con el token de la sesión
    let userData = await pool.query('SELECT * FROM `users_sessions` AS a LEFT JOIN users AS b ON b.users_id = a.users_id WHERE users_sessions_code = ?;', [userToken]);
    userData = JSON.parse(JSON.stringify(userData));

    // Hash del usuario
    const userHash = userData[0].users_code;

    fetch(config.apisRouteRedAzul+'/users/verifyAcount', {
        method: 'POST',
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ code, userHash })
    })
    .then(async response =>  {
        let data = await response.json();

        if (response.status === 200) {
            res.status(200).json({});
        }else{
            res.status(response.status).json({error: data});
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
}];

// Aceptar términos
controller.acceptTerms = [ verifyToken(config), body("accept").notEmpty(), async(req, res) => {
    // Manejar inputs
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const error = result.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        console.log(error);
        return res.status(400).json({ error });
    }

    try {
        // Datos del POST
        let accept = req.body.accept;
        let userToken = req.headers['authorization'];

        // Se recupera el hash del usuario con el token de la sesión
        let userData = await pool.query('SELECT * FROM `users_sessions` AS a LEFT JOIN users AS b ON b.users_id = a.users_id WHERE users_sessions_code = ?;', [userToken]);
        userData = JSON.parse(JSON.stringify(userData));

        // ID del usuario
        const userId = userData[0].users_id;

        if (accept == true) {
            await pool.query('UPDATE `users` SET `users_terms` = 1 WHERE `users_id` = ?', [userId]);
            
            res.status(200).json({});
        }else {
            res.status(400).json({error: 'Accept solo puede ser true'});
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Permisos AUNAP
controller.permsAunap = [ verifyToken(config), body("accept").notEmpty(), async(req, res) => {
    // Manejar inputs
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const error = result.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        console.log(error);
        return res.status(400).json({ error });
    }

    try {
        // Datos del POST
        let accept = req.body.accept;
        let userToken = req.headers['authorization'];

        console.log(userToken);

        // Se recupera el hash del usuario con el token de la sesión
        let userData = await pool.query('SELECT * FROM `users_sessions` AS a LEFT JOIN users AS b ON b.users_id = a.users_id WHERE users_sessions_code = ?;', [userToken]);
        userData = JSON.parse(JSON.stringify(userData));

        if (userData.length > 0) {
            // ID del usuario
            const userId = userData[0].users_id;

            if (accept == true) {
                await pool.query('UPDATE `users` SET `users_aunapPerms` = 1 WHERE `users_id` = ?', [userId]);
                
                res.status(200).json({});
            }else if(accept == false){
                await pool.query('UPDATE `users` SET `users_aunapPerms` = 0 WHERE `users_id` = ?', [userId]);
                
                res.status(200).json({});
            }else {
                res.status(400).json({error: 'Accept solo permite valores boolean'});
            }
        } else {
            res.status(400).json({error: 'Token no válido'});
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Crear perfil
controller.createProfile = [ verifyToken(config), async(req, res) => {
    // Token del usuario
    const userToken = req.headers['authorization'];

    // Se recupera el hash del usuario con el token de la sesión
    let userData = await pool.query('SELECT * FROM `users_sessions` AS a LEFT JOIN users AS b ON b.users_id = a.users_id WHERE users_sessions_code = ?;', [userToken]);
    userData = JSON.parse(JSON.stringify(userData));

    // Hash del usuario
    const userHash = userData[0].users_code;

    fetch(config.apisRouteRedAzul+'/users/createProfile', {
        method: 'POST',
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ body: req.body, userHash })
    })
    .then(async response =>  {
        if (response.status === 200) {

            res.status(200).json({});
        }else{
            let data = await response.json();
            console.log(data);
            res.status(response.status).json({error: data});
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
}];

// Seleccionar tipo de usuario
controller.selectProfile = [ verifyToken(config), body("accept").notEmpty(), async(req, res) => {
    // Token del usuario
    const userToken = req.headers['authorization'];

    // Tipo de usuario POST
    const userTypePost = req.body.userType;

    let userTypeValid = await pool.query('SELECT * FROM `users_types` WHERE users_types_id = ?', [ userTypePost ]);
    userTypeValid = JSON.parse(JSON.stringify(userTypeValid));

    if (userTypeValid.length > 0) {
        // Se recupera el hash del usuario con el token de la sesión
        let userData = await pool.query('SELECT * FROM `users_sessions` AS a LEFT JOIN users AS b ON b.users_id = a.users_id WHERE users_sessions_code = ?;', [userToken]);
        userData = JSON.parse(JSON.stringify(userData));

        // Hash del usuario
        const userId= userData[0].users_id;

        // Tipo de usuario
        const userType = userData[0].users_type;

        // Se verifica si el usuario ya tiene un tipo de usuario
        if (userType == null) {
            await pool.query('UPDATE `users` SET `users_type`= ? WHERE `users_id` = ?', [ userId, userType ]);

            res.status(200).json({});
        } else {
            res.status(400).json({error: 'El usuario ya ha seleccionado un usuario'});
        }
    } else {
        res.status(400).json({error: 'Tipo de usuario no válido'});
    }
}];


module.exports = controller;