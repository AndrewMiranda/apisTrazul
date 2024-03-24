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
const { validProductiveUnitType, getUserId, userOwnerProductiveUnit, getUserHash, productiveUnitActive } = require('./common/productiveUnitsEdit.js');
const { generaterRandomSerial, generaterBatchToken } = require('../../../helpers/serialTrazul');

// Controlador base
const controller = {};

// Crear lote alevinera
controller.createBatchAlevinera = [verifyToken(config), body("specie").notEmpty().isInt(), body("harvestDate").notEmpty().isISO8601("yyyy-mm-dd").toDate(), body("quantityFish").notEmpty().isFloat(), body("age").notEmpty().isInt(), body("ageUnit").notEmpty().isInt(), body("broodstock").notEmpty().isInt(), body("serial").notEmpty(), body("description"), body("feed").notEmpty(), body("medicines").notEmpty(), body("ponds").notEmpty(), body("productiveUnit").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS POST
        const productiveUnitId = req.body.productiveUnit;
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

        if (!validBroodstock.length > 0) throw "El padrote no existe";

        // Se parsean los estanques
        ponds = JSON.parse(ponds);

        // Se verifica que los estanques sean válidos
        for (let index = 0; index < ponds.length; index++) {
            const element = ponds[index];
            
            let validPond = await pool.query('SELECT productiveUnits_ponds_state AS state FROM `productiveUnits_ponds` WHERE productiveUnits_ponds_id = ? AND productiveUnits_id = ?', [ element, productiveUnitId ]); 
            validPond = JSON.parse(JSON.stringify(validPond));

            if (!validPond.length > 0) throw `El estanque '${element}' no existe o no le pertenece a la granja`;

            if (validPond[0].state == 0) throw `El estanque '${element}' se encuentra desactivado`;
        }

        // Se parsean los medicamentos
        medicines = JSON.parse(medicines);

        // Se verifica que los medicamentos sean válidos
        for (let index = 0; index < medicines.length; index++) {
            const element = medicines[index];
            
            let validMedicine = await pool.query('SELECT productiveUnits_medicine_state AS state FROM `productiveUnits_medicine` WHERE productiveUnits_medicine_id = ? AND productiveUnits_id = ?', [ element, productiveUnitId ]); 
            validMedicine = JSON.parse(JSON.stringify(validMedicine));

            if (!validMedicine.length > 0) throw `El medicamento '${element}' no existe o no le pertenece a la granja`;

            if (validMedicine[0].state == 0) throw `El medicamento '${element}' se encuentra desactivado`;
        }

        // Se parsean los piensos
        feed = JSON.parse(feed);

        // Se verifica que los piensos sean válidos y si se pueden agregar
        for (let index = 0; index < feed.length; index++) {
            const element = feed[index];

            const feedId = element[0];
            const feedQuantity = element[1];
            
            let validFeed = await pool.query('SELECT productiveUnits_feed_state AS state, productiveUnits_feed_quantityIterator AS quantity FROM `productiveUnits_feed` WHERE productiveUnits_feed_id = ? AND productiveUnits_id = ?', [ feedId, productiveUnitId ]); 
            validFeed = JSON.parse(JSON.stringify(validFeed));

            if (!validFeed.length > 0) throw `El pienso '${feedId}' no existe o no le pertenece a la granja`;

            if (validFeed[0].state == 0) throw `El pienso '${feedId}' se encuentra desactivado`;

            if (feedQuantity > validFeed[0].quantity) throw `El pienso '${feedId}' no cuenta con la cantidad suficiente (${feedQuantity})`;
        }

        // Se construye el JSON del body
        let body = {
            productiveUnitId,
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

        // Se genera el token
        const token = generaterBatchToken(productiveUnitId, 1);

        // Se registra el lote
        await pool.query('INSERT INTO `batches`(`batches_token`, `batches_productiveUnit`, `batchesTypes_id`, `batches_body`) VALUES (?, ?, ?, ?)', [ token, productiveUnitId, 1, JSON.stringify(body) ]);

        res.status(200).json({token});
    } catch (error) {
        console.log(error);
        res.status(400).json({error: error});
    }
}];

// Obtener lotes generados de una unidad productiva
controller.getBatches = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // Se obtiene el ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId)) throw `Esta unidad productiva no pertenece a este usuario.`;
        
        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        let batches = await pool.query('SELECT batches_token AS token, batches_date AS date, batches_packOff AS packOff FROM `batches` WHERE batches_productiveUnit = ?', [ productiveUnitId ]);
        batches = JSON.parse(JSON.stringify(batches));

        res.status(200).json({batches});
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