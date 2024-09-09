// Configuración de las API's
const config = require("./configApis");

// Librerias
const pool = require("../../../config/dbConnections"+config.DBName);
const { genRandomNumberCode, genRandomString } = require('../../../helpers/randomString');
const { handleValidationErrors } = require('../../../helpers/hasErrorsResults');
const { body, query } = require('express-validator');
const {sendMail} = require("../../../helpers/emails/index");
const { validProductiveUnitType, getUserId, userOwnerProductiveUnit, productiveUnitActive, getUserHash, getUserAuth } = require('./common/productiveUnitsEdit.js');

// Controlador
const controller = {};

// Obtene estanques de una unidad productiva
controller.getPonds = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), query("used").optional().isBoolean(), query("all").optional().isBoolean(), handleValidationErrors, async(req, res) => {
    try {   
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["skip"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // Todos los estanques?
        let all = req.query.all ?? "false";

        // Estanques usados o no usados?
        let used = req.query.used ?? false;

        let query ='';

        console.log(all)
        console.log(used)

        if (all == "false") {
            query += ` AND productiveUnits_ponds_used = ?`;
            
            if (used == "true") {
                used = 1;
            }else{
                used = 0;
            }
        }

        console.log("Used:"+ used)

        let ponds = await pool.query('SELECT productiveUnits_ponds_id AS id, productiveUnits_ponds_name AS name, b.ponds_types_name AS type, productiveUnits_ponds_used AS used, productiveUnits_ponds_location AS location, productiveUnits_ponds_area AS area, productiveUnits_ponds_volume AS volume, productiveUnits_ponds_additionalInfo AS additionalInfo, productiveUnits_ponds_RAS AS RAS, productiveUnits_ponds_IPBRS AS IPBRS FROM `productiveUnits_ponds` AS a LEFT JOIN ponds_types AS b ON b.ponds_types_id = a.productiveUnits_ponds_type WHERE productiveUnits_id = ? AND productiveUnits_ponds_state = 1'+query, [productiveUnitId, used]);
        ponds = JSON.parse(JSON.stringify(ponds));
        
        res.status(200).json({ponds});
    } catch (error) {
        console.error(error);
        res.status(400).json({error});
    }
}];

// Obtene tipos de estanques
controller.pondsTypes = [verifyToken(config), async(req, res) => {
    try {
        let pondsTypes = await pool.query('SELECT ponds_types_id AS id, ponds_types_name AS name, ponds_types_description AS description FROM `ponds_types`');
        pondsTypes = JSON.parse(JSON.stringify(pondsTypes));

        res.status(200).json({pondsTypes});
    } catch (error) {
        console.error(error);
        res.status(400).json({error});
    }
}];

module.exports = controller;