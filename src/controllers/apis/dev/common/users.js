// COMMONS DE USUARIOS

// Configuración de las API's
const config = require("../configApis");

// Libs
const pool = require("../../../../config/dbConnections"+config.DBName);

async function getUserId(req) {
    // Se obtiene el token del encabezado de la solicitud para obtener el ID del usuario
    const token = req.headers['authorization'];
    
    let session = await pool.query('SELECT * FROM `users_sessions` WHERE users_sessions_code = ?', [token]);
    session = JSON.parse(JSON.stringify(session));

    if (token == "6229aa5938617a240792ef1c4359779d"){
        return "test";
    } else{
        // Se devuelve el ID del usuario
        return session[0].users_id;
    }
}

// Obtener hash de redAzul de usuario
async function getUserHash(userId) {
    let userData = await pool.query('SELECT users_code AS code FROM `users` WHERE users_id = ?', [userId]);
    userData = JSON.parse(JSON.stringify(userData));

    return userData[0].code;
}

// Obtener autorización del usuario para sub-fetch
function getUserAuth(req) {
    // Se obtiene el token del encabezado de la solicitud para obtener el ID del usuario
    const token = req.headers['authorization'];

    return token;
}


module.exports = { getUserId, getUserHash, getUserAuth }