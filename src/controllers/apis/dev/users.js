// Configuración de las API's
const config = require("./configApis");

// Librerias
const pool = require("../../../config/dbConnections"+config.DBName);
const fetch = require('node-fetch');
const verifyToken = require("./../../../helpers/auth");
const { genRandomNumberCode, generateRandomHash } = require('../../../helpers/randomString');
const { handleValidationErrors } = require('../../../helpers/hasErrorsResults');
const { body, query, param } = require('express-validator');
const { getUserId, getUserHash } = require('./common/users');
const { getUserIp } = require('../../../helpers/ipsFunctions');

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

// Reenviar código de verificación
controller.resendCodeVerification = [ verifyToken(config),  handleValidationErrors, async(req, res) => {
    let userHash = await getUserHash(await getUserId(req));

    await fetch(config.apisRouteRedAzul+'/users/resendCodeVerification?userHash='+userHash, {
        method: 'GET'
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

// Verificación de usuario
controller.verifyAcount = [ verifyToken(config), body("code").notEmpty(), handleValidationErrors, async(req, res) => {
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
controller.acceptTerms = [ verifyToken(config), body("accept").notEmpty(), handleValidationErrors, async(req, res) => {
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
controller.permsAunap = [ verifyToken(config), body("accept").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // Datos del POST
        let accept = req.body.accept;
        let userToken = req.headers['authorization'];

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

// Editar perfil
controller.editProfile = [ verifyToken(config), async(req, res) => {
    // Token del usuario
    const userToken = req.headers['authorization'];

    // Se recupera el hash del usuario con el token de la sesión
    let userData = await pool.query('SELECT * FROM `users_sessions` AS a LEFT JOIN users AS b ON b.users_id = a.users_id WHERE users_sessions_code = ?;', [userToken]);
    userData = JSON.parse(JSON.stringify(userData));

    // Hash del usuario
    const userHash = userData[0].users_code;

    fetch(config.apisRouteRedAzul+'/users/editUserData', {
        method: 'POST',
        headers: {"Content-Type": "application/json", "authorization": "pub_2faf2c9769ca1c5e7db0557a5de5108e2593f05b759a566068cf4667cee63f45"},
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
controller.selectProfile = [ verifyToken(config), body("accept").notEmpty(), handleValidationErrors, async(req, res) => {
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

controller.getUserData = [ verifyToken(config), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);

        let hash = await pool.query('SELECT users_code AS hash FROM `users` WHERE users_id = ?', [ userId ]);
        hash = JSON.parse(JSON.stringify(hash));

        hash = hash[0].hash;

        const authorizationKey = "pub_2faf2c9769ca1c5e7db0557a5de5108e2593f05b759a566068cf4667cee63f45";

        let userData = await fetch(`${config.apisRouteRedAzul}/users/data?userHash=${hash}`, {
            method: 'GET',
            headers: { "Authorization": authorizationKey }
        })
        .then(async response =>  {
            if (response.status === 200) {
                return await response.json();
            }
        })

        res.status(200).json({userData: userData.userData});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

controller.getOtherUserData = [ verifyToken(config), query("user").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = req.query.user;

        let hash = await pool.query('SELECT users_code AS hash FROM `users` WHERE users_id = ?', [ userId ]);
        hash = JSON.parse(JSON.stringify(hash));

        hash = hash[0].hash;

        const authorizationKey = "pub_2faf2c9769ca1c5e7db0557a5de5108e2593f05b759a566068cf4667cee63f45";

        let userData = await fetch(`${config.apisRouteRedAzul}/users/data?userHash=${hash}`, {
            method: 'GET',
            headers: { "Authorization": authorizationKey }
        })
        .then(async response =>  {
            if (response.status === 200) {
                return await response.json();
            }else{
                throw await response.json();
            }
        }).catch(err => {
            throw err;
        });

        res.status(200).json({userData: userData.userData});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

controller.getUserDataWithEmail = [ verifyToken(config), query("email"), handleValidationErrors, async(req, res) => {
    // Datos GET
    const email = req.query.email;

    const authorizationKey = "pub_2faf2c9769ca1c5e7db0557a5de5108e2593f05b759a566068cf4667cee63f45";

    await fetch(`${config.apisRouteRedAzul}/users/exist/email?userEmail=${email}`, {
        method: 'GET',
        headers: { "Authorization": authorizationKey }
    })
    .then(async response =>  {
        if (response.status === 200) {
            userData = await response.json();

            res.status(200).json({userData});
        }else{
            error = await response.json();

            res.status(400).json({error: error.error});
        }
    })
}];

controller.login = [ body("email").notEmpty().isEmail(), body('password').notEmpty().isLength({ min: 6 }), handleValidationErrors, async(req, res) => {
    try {
        // Se obtiene el email y la contraseña
        const email = req.body.email;
        const password = req.body.password;

        await fetch(config.apisRouteRedAzul+"/users/login", {
            method: "POST",
            headers: { "Authorization": config.authRedAzul, "Content-Type": "application/json" },
            body: JSON.stringify({email, password})
        }).then(async response => {
            if (response.ok) {
                // Se obtiene el hash del usuario
                let hash = await response.json();
                hash = hash.hash;

                // Se verifica si el usuario cuenta con usuario en trazul y se obtiene el ID del usuario
                let userData = await pool.query('SELECT users_id AS id FROM `users` WHERE users_code = ?', [ hash ]);
                userData = JSON.parse(JSON.stringify(userData));

                if (!userData.length > 0) throw "El usuario no ha asociado su cuenta a Trazul";

                userId = userData[0].id;

                // Se crea un token para la nueva sesión
                token = generateRandomHash(32);

                // Se obtiene el IP del usuario
                let sessionIp = getUserIp(req);

                // Se crea una sesión nueva
                await pool.query('INSERT INTO `users_sessions`(`users_id`, `users_sessions_code`, `users_sessions_ip`) VALUES (?, ?, ?)', [ userId, token, sessionIp ]);

                res.status(200).json({session: token});
            } else {
                // Se obtiene el error
                let error = await response.json();
                error = error.error;

                throw error
            }
        })
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

controller.logout = [ verifyToken(config), async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);

        await pool.query('DELETE FROM `users_sessions` WHERE `users_id` = ?', [ userId ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Aceptar invitación de trazabilidad de email
controller.acceptStaffEmail = [ query("u").notEmpty().isInt(), query("p").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = req.query.u;

        // ID de la unidad productiva
        const productiveUnitId = req.query.p;

        // Se verifica si la invitación existe
        let existInvitation = await pool.query('SELECT traceabilityStaff_id AS id FROM `traceabilityStaff` WHERE users_id = ? AND productiveUnits_id  = ? AND traceabilityStaff_state = 0', [ userId, productiveUnitId ]);
        existInvitation = JSON.parse(JSON.stringify(existInvitation));

        if (existInvitation.length > 0) {
            let editInvitation = await pool.query('UPDATE `traceabilityStaff` SET `traceabilityStaff_state`= 1 WHERE `traceabilityStaff_id` = ?', [ existInvitation[0].id ]);

            // Se verifica si se editó correctamente la invitación
            if (editInvitation.affectedRows > 0) {
                res.render("redirectEmails/aceptInvitationStaff", { verify: true });
            } else {
                res.render("redirectEmails/aceptInvitationStaff", { verify: false, error: "Error al aceptar invitación" });
            }
        }else{
            res.render("redirectEmails/aceptInvitationStaff", { verify: false, error: "La invitación no existe o ya caducó, intenta nuevamente o pídele al dueño de la unidad productiva que te invite nuevamente. 😉" });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Rechazar invitación de trazabilidad de email
controller.rejectStaffEmail = [ query("u").notEmpty().isInt(), query("p").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = req.query.u;

        // ID de la unidad productiva
        const productiveUnitId = req.query.p;

        // Se verifica si la invitación existe
        let existInvitation = await pool.query('SELECT traceabilityStaff_id AS id FROM `traceabilityStaff` WHERE users_id = ? AND productiveUnits_id  = ? AND traceabilityStaff_state = 0', [ userId, productiveUnitId ]);
        existInvitation = JSON.parse(JSON.stringify(existInvitation));

        if (existInvitation.length > 0) {
            let editInvitation = await pool.query('UPDATE `traceabilityStaff` SET `traceabilityStaff_state`= 2 WHERE `traceabilityStaff_id` = ?', [ existInvitation[0].id ]);

            // Se verifica si se editó correctamente la invitación
            if (editInvitation.affectedRows > 0) {
                res.render("redirectEmails/rejectedInvitationStaff", { verify: true });
            } else {
                res.render("redirectEmails/rejectedInvitationStaff", { verify: true, error: "Error al rechazar la invitación, intente nuevamente" });
            }
        }else{
            res.render("redirectEmails/rejectedInvitationStaff", { verify: true, error: "La invitación no existe o ya caducó." });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Revisar invitaciones de trazabilidad 
controller.hasStaffInvitations = [ verifyToken(config), handleValidationErrors, async(req, res) => {
    try {
        // ID y hash del usuario
        const userId = await getUserId(req);
        const userHash = await getUserHash(userId);

        let email = await fetch(`${config.apisRouteRedAzul}/users/data?userHash=${userHash}`, {
            method: 'GET',
            headers: { "Authorization": config.authRedAzul }
        })
        .then(async response =>  {
            if (response.status === 200) {

                data = await response.json();
                data = data.userData;

                return data.email;
            }else{
                throw data;
            }
        })
        .catch(err => {
            throw err;
        });

        let hasInvitations = await pool.query('SELECT b.traceabilityStaff_id AS invitation, b.productiveUnits_id AS productiveUnitId FROM `traceabilityStaff_invitations` AS a LEFT JOIN traceabilityStaff AS b ON b.traceabilityStaff_id = a.traceabilityStaff_id WHERE a.user_email = ?', [ email ]);
        hasInvitations = JSON.parse(JSON.stringify(hasInvitations));

        for (let index = 0; index < hasInvitations.length; index++) {
            const element = hasInvitations[index];

            let productiveUnitData = await fetch(`${config.apisRoute}/productiveUnits/nameWithIdTrazul?productiveUnitId=${element.productiveUnitId}`, {
                method: 'GET',
                headers: { "Authorization": config.trazulKey }
            })
            .then(async response =>  {
                if (response.status === 200) {
    
                    data = await response.json();

                    return data;
                }else{
                    throw await response.json();;
                }
            })

            element.productiveUnitType = productiveUnitData.type;
            element.productiveUnitName = productiveUnitData.name;

        }

        res.status(200).json({hasInvitations});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Aceptar invitación de trazabilidad desde la app
controller.acceptStaffInvitations = [ verifyToken(config), query("invitationId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const invitationId = req.query.invitationId;

        // Se verifica si la invitación existe
        let existInvitation = await pool.query('SELECT traceabilityStaff_id AS id FROM `traceabilityStaff` WHERE traceabilityStaff_id = ? AND traceabilityStaff_state = 0', [ invitationId ]);
        existInvitation = JSON.parse(JSON.stringify(existInvitation));

        if (existInvitation.length > 0) {
            let editInvitation = await pool.query('UPDATE `traceabilityStaff` SET `traceabilityStaff_state`= 1 WHERE `traceabilityStaff_id` = ?', [ invitationId ]);

            await pool.query('DELETE FROM `traceabilityStaff_invitations` WHERE `traceabilityStaff_id` = ?', [ invitationId ]);

            // Se verifica si se editó correctamente la invitación
            if (editInvitation.affectedRows > 0) {
                res.status(200).json({});
            } else {
                throw "Error al aceptar invitación, intente nuevamente";
            }
        }else{
            res.status(400).json({error: 'Invitación no válida'});
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Rechazar invitación de trazabilidad desde la app
controller.rejectStaffInvitations = [ verifyToken(config), query("invitationId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const invitationId = req.query.invitationId;

        // Se verifica si la invitación existe
        let existInvitation = await pool.query('SELECT traceabilityStaff_id AS id FROM `traceabilityStaff` WHERE traceabilityStaff_id = ? AND traceabilityStaff_state = 0', [ invitationId ]);
        existInvitation = JSON.parse(JSON.stringify(existInvitation));

        if (existInvitation.length > 0) {
            let editInvitation = await pool.query('UPDATE `traceabilityStaff` SET `traceabilityStaff_state`= 2 WHERE `traceabilityStaff_id` = ?', [ invitationId ]);

            await pool.query('DELETE FROM `traceabilityStaff_invitations` WHERE `traceabilityStaff_id` = ?', [ invitationId ]);

            // Se verifica si se editó correctamente la invitación
            if (editInvitation.affectedRows > 0) {
                res.status(200).json({});
            } else {
                throw "Error al aceptar invitación, intente nuevamente";
            }
        }else{
            res.status(400).json({error: 'Invitación no válida'});
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

module.exports = controller;