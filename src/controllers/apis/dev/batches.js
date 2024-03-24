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
const { generaterRandomSerial } = require('../../../helpers/serialTrazul');

// Controlador base
const controller = {};

// Crear lote alevinera
controller.createBatchAlevinera = [verifyToken(config), body("specie").notEmpty().isInt(), body("harvestDate").notEmpty().isISO8601("yyyy-mm-dd").toDate(), body("quantityFish").notEmpty().isFloat(), body("age").notEmpty().isInt(), body("ageUnit").notEmpty().isInt(), body("broodstock").notEmpty().isInt(), body("serial").notEmpty(), body("description"), body("feed").notEmpty(), body("medicines").notEmpty(), body("ponds").notEmpty(), body("productiveUnit").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS POST
        const productiveUnit = req.body.productiveUnit;
        const specie = req.body.specie;
        const harvestDate = req.body.harvestDate;
        const quantityFish = req.body.quantityFish;
        const age = req.body.age;
        const ageUnit = req.body.ageUnit;
        const broodstock = req.body.broodstock;
        const serial = req.body.serial;
        const description = req.body.description ?? "";
        let feed = req.body.feed;
        let medicines = req.body.medicines;
        let ponds = req.body.ponds;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId)) throw `Esta unidad productiva no pertenece a este usuario.`;
        
        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se verifica si el padrote existe
        let validBroodstock = await pool.query('SELECT * FROM `productiveUnits_broodstock` WHERE productiveUnits_broodstock_id = ? AND productiveUnits_id = ?', [ broodstock, productiveUnitId ]);
        validBroodstock = JSON.parse(JSON.stringify(validBroodstock));

        if (validBroodstock.length > 0) throw "El padrote no existe";

        // Se parsean los estanques
        ponds = JSON.parse(ponds);

        // Se parsean los medicamentos
        medicines = JSON.parse(medicines);

        // Se parsean los piensos
        feed = JSON.parse(feed);

        // Se verifica si los piensos se pueden agregar

        // Se construye el JSON del body
        let body = {
            specie,
            harvestDate,
            quantityFish,
            age,
            ageUnit,
            broodstock,
            serial,
            description,
            medicines,
            ponds
        }

        res.status(200).json({body});
    } catch (error) {
        console.log(error);
        res.status(400).json({error: error});
    }
}];

// Generar serial para lote
controller.generateSerial = [verifyToken(config), async(req, res) => {
    const randomSerial = generaterRandomSerial(2);

    res.status(200).json({"serial": randomSerial});
}];


module.exports = controller;