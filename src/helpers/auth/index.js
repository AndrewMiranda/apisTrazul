// Módulo de autenticación de usuarios

verifyToken = (config) => {
    return async (req, res, next) => {
        // Librerias
        const pool = require("../../config/dbConnections"+config.DBName);

        // Se obtiene el token del encabezado de la solicitud
        const token = req.headers['authorization']; 

        // Se verifica que el token viene en el encabezado
        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        
        // Se verifica si el token está vacío
        if (token == "") {
            return res.status(401).json({ error: 'Token no puede estar vacío' });
        }

        // Se verifica si el token es nulo
        if (token == null) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        // Se verifica si es token de prueba
        if (token == "redAzulTokenTest") {
            next();
        }else{
            // Se valida el token
            let tokenExist = await pool.query('SELECT * FROM `users_sessions` WHERE users_sessions_code = ?', [token]);
            tokenExist = JSON.parse(JSON.stringify(tokenExist));

            if (tokenExist.length > 0) {
                next();
            } else {
                return res.status(400).json({error: 'Token no válido'});
            }
        }
    }
}

module.exports = verifyToken;