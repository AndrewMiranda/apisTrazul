// Configuración de las API's
const config = require("./configApis");

// Librerias
const pool = require("../../../config/dbConnections"+config.DBName);
const fetch = require('node-fetch');
const verifyToken = require("./../../../helpers/auth");
const { genRandomNumberCode, generateRandomHash } = require('../../../helpers/randomString');
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../../../helpers/hasErrorsResults');
const {sendMail} = require("../../../helpers/emails/index");
const { validProductiveUnitType, getUserId, userOwnerProductiveUnit, getUserHash, productiveUnitActive, constructTraceability, getCountryName, getDocumentTypeName } = require('./common/batches');
const { spececieName, formatDate, ageUnit, broodstockData, feedData, medicineData, pondData, dispatchData, fingerlingsData } = require("./common/batchesAux");
const { generaterRandomSerial, generaterBatchToken, generaterDispatchToken } = require('../../../helpers/serialTrazul');

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
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;
        
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
            quantityFishIterator: quantityFish,
            age,
            ageUnit,
            broodstock,
            serial,
            description,
            medicines,
            ponds,
            feed
        }

        // Se genera el token
        const token = generaterBatchToken(productiveUnitId, 1);

        // Se registra el lote
        await pool.query('INSERT INTO `batches`(`batches_token`, `batches_productiveUnit`, `batchesTypes_id`, `batches_body`) VALUES (?, ?, ?, ?)', [ token, productiveUnitId, 1, JSON.stringify(body) ]);

        res.status(200).json({token});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Crear lote alevinera derivado
controller.createBatchAlevineraDerivative = [verifyToken(config), body("productiveUnit").notEmpty().isInt(), body("token").notEmpty(), body("quantityFish").notEmpty().isInt(), body("serial").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // Se obtiene el id de la unidad productiva, el token del lote, la cantidad de individuos y la descripción
        const productiveUnitId = req.body.productiveUnit;
        const token = req.body.token;
        const quantityFish = req.body.quantityFish;
        const serial = req.body.serial;
        const description = req.body.description ?? null;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;
        
        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se verifica si el token corresponde a un lote válido
        let mainBatchData = await pool.query('SELECT batches_productiveUnit AS productiveUnit, batches_body AS body, batches_token AS token, batchesTypes_id AS type, batches_packOff AS packOff FROM `batches` WHERE batches_token = ?', [ token ]);
        mainBatchData = JSON.parse(JSON.stringify(mainBatchData));

        if (!mainBatchData.length > 0) throw `El lote '${token}' no existe.`;

        // Se verifica si el lote es de la misma unidad productiva
        if (mainBatchData[0].productiveUnit != productiveUnitId ) throw `El lote '${token}' no pertenece a la unidad productiva.`;

        // Se verifica si el lote se encuentra activo
        if (mainBatchData[0].packOff == 2 ) throw `El lote '${token}' está descontinuado o completamente despachado.`;

        // Se verifica si se puede derivar el lote según la cantidad de individuos
        let bodyMainBatch = JSON.parse(mainBatchData[0].body);

        if (parseInt(quantityFish) > parseInt(bodyMainBatch.quantityFishIterator)) throw `El lote '${token}' no cuenta con la cantidad de individuos necesaria. Faltan ${Math.abs(bodyMainBatch.quantityFishIterator-quantityFish)}`;

        // Se verifica si el lote a derivar es un lote completo y no uno derivado
        if (mainBatchData[0].type != 1) throw "No se puede derivar un lote de otro lote derivado";

        // Se genera el nuevo token
        const newToken = generaterBatchToken(productiveUnitId, 2); 

        // Se construye el body
        let body = {
            quantityFish,
            quantityFishIterator: quantityFish,
            serial,
            description
        }

        // Se guarda el token anterior
        let prevToken = [ mainBatchData[0].token ];
        prevToken = JSON.stringify(prevToken);

        // Se registra el lote
        await pool.query('INSERT INTO `batches`(`batches_token`, `batches_productiveUnit`, `batchesTypes_id`, `batches_prevToken`, `batches_body`) VALUES (?, ?, ?, ?, ?)', [ newToken, productiveUnitId, 2, prevToken, JSON.stringify(body) ]);

        // Se actualiza el lote principal según la cantidad de individuos restantes
        let newQuantity = parseInt(bodyMainBatch.quantityFish)-parseInt(quantityFish);
        if (newQuantity > 0) {
            await pool.query('UPDATE `batches` SET `batches_body` = JSON_SET(batches_body, "$.quantityFishIterator", ?) WHERE `batches_token` = ? AND `batchesTypes_id` = 1', [ newQuantity, token ]);
        } else {
            await pool.query('UPDATE `batches` SET `batches_body` = JSON_SET(batches_body, "$.quantityFishIterator", ?) ,`batches_packOff`= 2 WHERE `batches_token` = ? AND `batchesTypes_id` = 1', [ 0, token ]);
        }

        res.status(200).json({newToken});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Crear lote alevinera mezclado
controller.createBatchAlevineraMixed = [verifyToken(config), body("productiveUnit").notEmpty().isInt(), body("tokens").notEmpty(), body("serial").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // Datos POST
        const productiveUnitId = req.body.productiveUnit;
        let tokens = req.body.tokens;
        const serial = req.body.serial;
        const description = req.body.description;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;
        
        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se parsea el array de tokens
        tokens = JSON.parse(tokens);

        if (tokens.length < 2) throw "No se puede mezclar un solo lote, por favor agrega más de uno."

        // Se verifica si los tokens son válidos y si tienen la cantidad de individuos necesaria
        let repeatToken = [];
        let batchQuantity = [];
        let species = [];
        let finalQuantity = 0;

        for (let index = 0; index < tokens.length; index++) {
            const element = tokens[index];

            // Se obtiene el token y la cantidad de individuos
            const token = element[0];
            const quantity = element[1];

            // Se verifica si el token está repetido
            if (repeatToken.includes(token)) throw `El token ${token} está repetido, no puedes mezclar un lote consigo mismo`;

            repeatToken.push(token);

            // Se valida el si el token si corresponde a un lote
            let mainBatchData = await pool.query('SELECT batches_productiveUnit AS productiveUnit, batches_body AS body, batches_token AS token, batchesTypes_id AS type, batches_packOff AS packOff FROM `batches` WHERE batches_token = ?', [ token ]);
            mainBatchData = JSON.parse(JSON.stringify(mainBatchData));

            if (!mainBatchData.length > 0) throw `El lote '${token}' no existe.`;

            // Se verifica si el lote es de la misma unidad productiva
            if (mainBatchData[0].productiveUnit != productiveUnitId ) throw `El lote '${token}' no pertenece a la unidad productiva.`;

            // Se verifica si el lote se encuentra activo
            if (mainBatchData[0].packOff == 2 ) throw `El lote '${token}' está descontinuado o completamente despachado.`;

            // Se verifica si el lote cuenta con la cantidad de individuos necesaria
            let bodyMainBatch = JSON.parse(mainBatchData[0].body);

            // Si es la primera iteración se agrega la especie
            if (index == 0) {
                species.push(bodyMainBatch.specie);
            } else {
                // Se verifica si el lote es de la misma especie que los anteriores
                if (!species.includes(bodyMainBatch.specie)) throw `No puedes mezclar lotes con especies distintas. 🤨`;
            }

            if (parseInt(quantity) > parseInt(bodyMainBatch.quantityFishIterator)) throw `El lote '${token}' no cuenta con la cantidad de individuos necesaria. Faltan ${Math.abs(bodyMainBatch.quantityFishIterator-quantity)}`;

            // Se guarda el registro de peso para después
            batchQuantity.push(parseInt(bodyMainBatch.quantityFishIterator));

            finalQuantity += quantity;
        }

        // Se genera el nuevo token
        const newToken = generaterBatchToken(productiveUnitId, 3); 

        // Se construye el body
        let body = {
            mixed: tokens,
            finalQuantity,
            quantityFishIterator: finalQuantity,
            serial,
            description
        }   

        // Se guardan los tokens de los lotes que se mezclan
        let prevToken = repeatToken;
        prevToken = JSON.stringify(prevToken);

        // Se registra el lote
        await pool.query('INSERT INTO `batches`(`batches_token`, `batches_productiveUnit`, `batchesTypes_id`, `batches_prevToken`, `batches_body`) VALUES (?, ?, ?, ?, ?)', [ newToken, productiveUnitId, 3, prevToken, JSON.stringify(body) ]);

        // Se restan los individuos en los lotes principales
        for (let index = 0; index < tokens.length; index++) {
            const element = tokens[index];
            
            // Se obtiene el token y la cantidad de individuos
            const token = element[0];
            const quantity = element[1];

            // Se restan los individuos usados
            let remainingAmount = batchQuantity[index]-parseInt(quantity);

            // Se verifica si aún quedan individuos disponibles
            if (remainingAmount > 0) {
                await pool.query('UPDATE `batches` SET `batches_body` = JSON_SET(batches_body, "$.quantityFishIterator", ?) WHERE `batches_token` = ?', [ remainingAmount, token ]);
            }else{
                await pool.query('UPDATE `batches` SET `batches_body` = JSON_SET(batches_body, "$.quantityFishIterator", ?) ,`batches_packOff`= 2 WHERE `batches_token` = ?', [ remainingAmount, token ]);
            }
        }

        res.status(200).json({newToken});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Crear lote alevinera
controller.createBatchEngorde = [verifyToken(config), body("harvestDate").notEmpty().isISO8601("yyyy-mm-dd").toDate(), body("weight").notEmpty().isInt(), body("quantityFish").optional().isInt(), body("minimumSize").notEmpty().isInt(), body("maximumSize").notEmpty().isInt(), body("fingerlings").notEmpty(), body("serial").notEmpty(), body("description"), body("feed").notEmpty(), body("medicines").notEmpty(), body("ponds").notEmpty(), body("productiveUnit").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID de unidad productiva
        const productiveUnitId = req.body.productiveUnit;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;
        
        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Datos POST
        const harvestDate = req.body.harvestDate;
        const weight = req.body.weight;
        const quantityFish = req.body.quantityFish ?? 0;
        const minimumSize = req.body.minimumSize;
        const maximumSize = req.body.maximumSize;
        const serial = req.body.serial;
        const description = req.body.description ?? "";
        let ponds = req.body.ponds;
        let feed = req.body.feed;
        let medicines = req.body.medicines;
        let fingerlings = req.body.fingerlings;

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

            if (feedQuantity > validFeed[0].quantity){ 
                throw `El pienso '${feedId}' no cuenta con la cantidad suficiente (${feedQuantity})`;
            }else{
                // TMP - Debería disminuir la cantidad de pienso disponible
                //await pool.query('');
            }
        }

        // Se parsean los alevinos
        fingerlings = JSON.parse(fingerlings);

        let species = [];

        // Se verifica que los estanques sean válidos
        for (let index = 0; index < fingerlings.length; index++) {
            const element = fingerlings[index];
            
            let validFingerlings = await pool.query('SELECT productiveUnits_fingerlings_state AS state, specie_id AS specie FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ? AND productiveUnits_id = ?', [ element, productiveUnitId ]); 
            validFingerlings = JSON.parse(JSON.stringify(validFingerlings));

            if (!validFingerlings.length > 0) throw `Los alevinos '${element}' no existem o no le pertenecen a la granja`;

            if (validFingerlings[0].state == 0) throw `Los alevinos '${element}' se encuentra desactivados`;

            // Si es la primera iteración se agrega la especie
            if (index == 0) {
                species.push(validFingerlings[0].specie);
            } else {
                // Se verifica si el lote es de la misma especie que los anteriores
                if (!species.includes(validFingerlings[0].specie)) throw `No puedes mezclar alevines con especies distintas. 🤨`;
            }
        }

        // Se construye el JSON del body
        let body = {
            weight,
            weightIterator: weight,
            harvestDate,
            quantityFish,
            quantityFishIterator: quantityFish,
            minimumSize,
            maximumSize,
            serial,
            description,
            medicines,
            ponds,
            feed,
            fingerlings
        }

        // Se genera el token
        const token = generaterBatchToken(productiveUnitId, 4);

        // Se registra el lote
        await pool.query('INSERT INTO `batches`(`batches_token`, `batches_productiveUnit`, `batchesTypes_id`, `batches_body`) VALUES (?, ?, ?, ?)', [ token, productiveUnitId, 4, JSON.stringify(body) ]);

        res.status(200).json({token});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Crear lote engorde derivado
controller.engordeDerivative = [verifyToken(config), body("productiveUnit").notEmpty().isInt(), body("token").notEmpty(), body("weight").notEmpty().isFloat(), body("serial").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // Se obtiene el id de la unidad productiva, el token del lote, la cantidad de individuos y la descripción
        const productiveUnitId = req.body.productiveUnit;
        const token = req.body.token;
        const weight = req.body.weight;
        const serial = req.body.serial;
        const description = req.body.description ?? null;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;
        
        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se verifica si el token corresponde a un lote válido
        let mainBatchData = await pool.query('SELECT batches_productiveUnit AS productiveUnit, batches_body AS body, batches_token AS token, batchesTypes_id AS type, batches_packOff AS packOff FROM `batches` WHERE batches_token = ?', [ token ]);
        mainBatchData = JSON.parse(JSON.stringify(mainBatchData));

        if (!mainBatchData.length > 0) throw `El lote '${token}' no existe.`;

        // Se verifica si el lote es de la misma unidad productiva
        if (mainBatchData[0].productiveUnit != productiveUnitId ) throw `El lote '${token}' no pertenece a la unidad productiva.`;

        // Se verifica si el lote se encuentra activo
        if (mainBatchData[0].packOff == 2 ) throw `El lote '${token}' está descontinuado o completamente despachado.`;

        // Se verifica si se puede derivar el lote según la cantidad de individuos
        let bodyMainBatch = JSON.parse(mainBatchData[0].body);

        if (parseFloat(weight) > parseFloat(bodyMainBatch.weight)) throw `El lote '${token}' no cuenta con la cantidad de individuos necesaria. Faltan ${Math.abs(bodyMainBatch.weight-weight)}`;

        // Se verifica si el lote a derivar es un lote completo y no uno derivado
        if (mainBatchData[0].type != 4) throw "No se puede derivar un lote de otro lote derivado";

        // Se genera el nuevo token
        const newToken = generaterBatchToken(productiveUnitId, 5); 

        // Se construye el body
        let body = {
            weight,
            weightIterator: weight,
            serial,
            description
        }

        // Se guarda el token anterior
        let prevToken = [ mainBatchData[0].token ];
        prevToken = JSON.stringify(prevToken);

        // Se registra el lote
        await pool.query('INSERT INTO `batches`(`batches_token`, `batches_productiveUnit`, `batchesTypes_id`, `batches_prevToken`, `batches_body`) VALUES (?, ?, ?, ?, ?)', [ newToken, productiveUnitId, 5, prevToken, JSON.stringify(body) ]);

        // Se actualiza el lote principal según la cantidad de individuos restantes
        let newQuantity = parseFloat(bodyMainBatch.weight)-parseFloat(weight);
        if (newQuantity > 0) {
            await pool.query('UPDATE `batches` SET `batches_body` = JSON_SET(batches_body, "$.weightIterator", ?) WHERE `batches_token` = ? AND `batchesTypes_id` = 4', [ newQuantity, token ]);
        } else {
            await pool.query('UPDATE `batches` SET `batches_body` = JSON_SET(batches_body, "$.weightIterator", ?) ,`batches_packOff`= 2 WHERE `batches_token` = ? AND `batchesTypes_id` = 4', [ 0, token ]);
        }

        res.status(200).json({newToken});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Crear lote engorde mezclado
controller.engordeMixed = [verifyToken(config), body("productiveUnit").notEmpty().isInt(), body("tokens").notEmpty(), body("serial").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // Datos POST
        const productiveUnitId = req.body.productiveUnit;
        let tokens = req.body.tokens;
        const serial = req.body.serial;
        const description = req.body.description ?? "";

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;
        
        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se parsea el array de tokens
        tokens = JSON.parse(tokens);

        if (tokens.length < 2) throw "No se puede mezclar un solo lote, por favor agrega más de uno."

        // Se verifica si los tokens son válidos y si tienen la cantidad de individuos necesaria
        let repeatToken = [];
        let batchQuantity = [];
        let species = [];
        let finalQuantity = 0;

        for (let index = 0; index < tokens.length; index++) {
            const element = tokens[index];

            // Se obtiene el token y la cantidad de individuos
            const token = element[0];
            const quantity = element[1];

            // Se verifica si el token está repetido
            if (repeatToken.includes(token)) throw `El token ${token} está repetido, no puedes mezclar un lote consigo mismo`;

            repeatToken.push(token);

            // Se valida el si el token si corresponde a un lote
            let mainBatchData = await pool.query('SELECT batches_productiveUnit AS productiveUnit, batches_body AS body, batches_token AS token, batchesTypes_id AS type, batches_packOff AS packOff, batches_prevToken AS prevToken FROM `batches` WHERE batches_token = ?', [ token ]);
            mainBatchData = JSON.parse(JSON.stringify(mainBatchData));

            if (!mainBatchData.length > 0) throw `El lote '${token}' no existe.`;

            // Se verifica si el lote es de la misma unidad productiva
            if (mainBatchData[0].productiveUnit != productiveUnitId ) throw `El lote '${token}' no pertenece a la unidad productiva.`;

            // Se verifica si el lote se encuentra activo
            if (mainBatchData[0].packOff == 2 ) throw `El lote '${token}' está descontinuado o completamente despachado.`;

            // Se verifica si el lote cuenta con la cantidad de individuos necesaria
            let bodyMainBatch = JSON.parse(mainBatchData[0].body);

            // Se verifica si el lote es del tipo mixto
            if(mainBatchData[0].type == 6) throw "No puedes mezclar un lote con otro lote que ya fue mezclado.";

            // Se obtiene la especie de los alevinos
            let specie;
            if(mainBatchData[0].type == 5){
                let prevToken = JSON.parse(mainBatchData[0].prevToken);

                specieData = await pool.query('SELECT b.specie_id AS specie FROM `batches` AS a LEFT JOIN productiveUnits_fingerlings AS b ON b.productiveUnits_fingerlings_id = JSON_EXTRACT(batches_body, "$.fingerlings[0]") WHERE a.batches_token = ?', [ prevToken[0] ]);
                specieData = JSON.parse(JSON.stringify(specieData));

                if (!specieData.length > 0) throw `Error al obtener especie de alevinos`;

                specie = specieData[0].specie;
            }else{
                specieData = await pool.query('SELECT specie_id AS specie FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ?', [ bodyMainBatch.fingerlings[0] ]);
                specieData = JSON.parse(JSON.stringify(specieData));

                if (!specieData.length > 0) throw `Error al obtener especie de alevinos`;

                specie = specieData[0].specie;
            }

            // Si es la primera iteración se agrega la especie
            if (index == 0) {
                species.push(specie);
            } else {
                // Se verifica si el lote es de la misma especie que los anteriores
                if (!species.includes(specie)) throw `No puedes mezclar lotes con especies distintas. 🤨`;
            }

            if (parseFloat(quantity) > parseFloat(bodyMainBatch.weightIterator)) throw `El lote '${token}' no cuenta con la cantidad de individuos necesaria. Faltan ${Math.abs(bodyMainBatch.weightIterator-quantity)}`;

            // Se guarda el registro de peso para después
            batchQuantity.push(parseFloat(bodyMainBatch.weightIterator));

            finalQuantity += quantity;
        }

        // Se genera el nuevo token
        const newToken = generaterBatchToken(productiveUnitId, 6); 

        // Se construye el body
        let body = {
            mixed: tokens,
            weight: finalQuantity,
            weightIterator: finalQuantity,
            serial,
            description
        }   

        // Se guardan los tokens de los lotes que se mezclan
        let prevToken = repeatToken;
        prevToken = JSON.stringify(prevToken);

        // Se registra el lote
        await pool.query('INSERT INTO `batches`(`batches_token`, `batches_productiveUnit`, `batchesTypes_id`, `batches_prevToken`, `batches_body`) VALUES (?, ?, ?, ?, ?)', [ newToken, productiveUnitId, 6, prevToken, JSON.stringify(body) ]);

        // Se resta el peso en los lotes padre
        for (let index = 0; index < tokens.length; index++) {
            const element = tokens[index];
            
            // Se obtiene el token y la cantidad de individuos
            const token = element[0];
            const quantity = element[1];

            // Se restan los individuos usados
            let remainingAmount = parseFloat(batchQuantity[index])-parseFloat(quantity);

            // Se verifica si aún quedan individuos disponibles
            if (remainingAmount > 0) {
                await pool.query('UPDATE `batches` SET `batches_body` = JSON_SET(batches_body, "$.weightIterator", ?) WHERE `batches_token` = ?', [ remainingAmount, token ]);
            }else{
                await pool.query('UPDATE `batches` SET `batches_body` = JSON_SET(batches_body, "$.weightIterator", ?) ,`batches_packOff`= 2 WHERE `batches_token` = ?', [ remainingAmount, token ]);
            }
        }

        res.status(200).json({newToken});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
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
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["lotes", "despachos"])) throw `Esta unidad productiva no pertenece a este usuario.`;
        
        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Lotes que no han sido despachados
        let batchesWhitout = await pool.query('SELECT batches_token AS token, batches_date AS date, batches_packOff AS packOff, batchesTypes_id AS type, batches_body AS body, batches_prevToken AS prevToken FROM `batches` WHERE batches_productiveUnit = ? AND batches_packOff = 0', [ productiveUnitId ]);
        batchesWhitout = JSON.parse(JSON.stringify(batchesWhitout));

        for (const iterator of batchesWhitout) {
            if (iterator.type == 1 || iterator.type == 4) {
                let body = JSON.parse(iterator.body);

                if (iterator.type == 4) {
                    let fingerling = body.fingerlings;

                    let fingerlingData = await pool.query('SELECT specie_id AS specie FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ?', [ fingerling[0] ]);
                    fingerlingData = JSON.parse(JSON.stringify(fingerlingData));
                    
                    body.specie = fingerlingData[0].specie;
                }

                iterator.specie = await spececieName(body.specie) ?? "";
                iterator.serial = body.serial;

                iterator.type = undefined;
                iterator.body = undefined;
                iterator.prevToken = undefined;
            }else if(iterator.type == 2 || iterator.type == 3 || iterator.type == 5 || iterator.type == 6){
                let prevTokenBatch = JSON.parse(iterator.prevToken);

                while (true) {
                    let batch = await pool.query('SELECT batchesTypes_id AS type, batches_body AS body, batches_prevToken AS prevToken FROM `batches` WHERE batches_token = ?', [ prevTokenBatch[0] ]);
                    batch = JSON.parse(JSON.stringify(batch));

                    if (batch[0].type == 1 || batch[0].type == 4) {
                        let body = JSON.parse(batch[0].body);

                        if (batch[0].type == 4) {
                            let fingerling = body.fingerlings;
        
                            let fingerlingData = await pool.query('SELECT specie_id AS specie FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ?', [ fingerling[0] ]);
                            fingerlingData = JSON.parse(JSON.stringify(fingerlingData));
                            
                            body.specie = fingerlingData[0].specie;
                        }
                        
                        iterator.specie = await spececieName(body.specie) ?? "";
                        iterator.serial = body.serial;

                        iterator.type = undefined;
                        iterator.body = undefined;
                        iterator.prevToken = undefined;

                        break
                    }else{
                        prevTokenBatch = iterator.prevToken;
                        continue;
                    }
                }
            }   
        }

        // Lotes que han sido parcialmente despachados
        let batchesPartial = await pool.query('SELECT batches_token AS token, batches_date AS date, batches_packOff AS packOff, batchesTypes_id AS type, batches_body AS body, batches_prevToken AS prevToken FROM `batches` WHERE batches_productiveUnit = ? AND batches_packOff = 1', [ productiveUnitId ]);
        batchesPartial = JSON.parse(JSON.stringify(batchesPartial));

        for (const iterator of batchesPartial) {
            if (iterator.type == 1 || iterator.type == 4) {
                let body = JSON.parse(iterator.body);

                if (iterator.type == 4) {
                    let fingerling = body.fingerlings;

                    let fingerlingData = await pool.query('SELECT specie_id AS specie FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ?', [ fingerling[0] ]);
                    fingerlingData = JSON.parse(JSON.stringify(fingerlingData));
                    
                    body.specie = fingerlingData[0].specie;
                }

                iterator.specie = await spececieName(body.specie) ?? "";
                iterator.serial = body.serial;

                iterator.type = undefined;
                iterator.body = undefined;
                iterator.prevToken = undefined;
            }else if(iterator.type == 2 || iterator.type == 3 || iterator.type == 5 || iterator.type == 6){
                let prevTokenBatch = JSON.parse(iterator.prevToken);

                while (true) {
                    let batch = await pool.query('SELECT batchesTypes_id AS type, batches_body AS body, batches_prevToken AS prevToken FROM `batches` WHERE batches_token = ?', [ prevTokenBatch[0] ]);
                    batch = JSON.parse(JSON.stringify(batch));

                    if (batch[0].type == 1 || batch[0].type == 4) {
                        let body = JSON.parse(batch[0].body);

                        if (batch[0].type == 4) {
                            let fingerling = body.fingerlings;
        
                            let fingerlingData = await pool.query('SELECT specie_id AS specie FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ?', [ fingerling[0] ]);
                            fingerlingData = JSON.parse(JSON.stringify(fingerlingData));
                            
                            body.specie = fingerlingData[0].specie;
                        }
                        
                        iterator.specie = await spececieName(body.specie) ?? "";
                        iterator.serial = body.serial;

                        iterator.type = undefined;
                        iterator.body = undefined;
                        iterator.prevToken = undefined;

                        break
                    }else{
                        prevTokenBatch = iterator.prevToken;
                        continue;
                    }
                }
            }   
        }

        // Se agrupan los lotes
        let batches = {
            batchesWhitout,
            batchesPartial
        };

        // Se verifica si se mandó el parametro opcional
        if (!req.query.available) {
            // Lotes que han sido parcialmente despachados
            let batchesPackOff = await pool.query('SELECT batches_token AS token, batches_date AS date, batches_packOff AS packOff, batchesTypes_id AS type, batches_body AS body, batches_prevToken AS prevToken FROM `batches` WHERE batches_productiveUnit = ? AND batches_packOff = 2', [ productiveUnitId ]);
            batchesPackOff = JSON.parse(JSON.stringify(batchesPackOff));

            for (const iterator of batchesPackOff) {
                if (iterator.type == 1 || iterator.type == 4) {
                    let body = JSON.parse(iterator.body);
    
                    if (iterator.type == 4) {
                        let fingerling = body.fingerlings;
    
                        let fingerlingData = await pool.query('SELECT specie_id AS specie FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ?', [ fingerling[0] ]);
                        fingerlingData = JSON.parse(JSON.stringify(fingerlingData));
                        
                        body.specie = fingerlingData[0].specie;
                    }
    
                    iterator.specie = await spececieName(body.specie) ?? "";
                    iterator.serial = body.serial;
    
                    iterator.type = undefined;
                    iterator.body = undefined;
                    iterator.prevToken = undefined;
                }else if(iterator.type == 2 || iterator.type == 3 || iterator.type == 5 || iterator.type == 6){
                    let prevTokenBatch = JSON.parse(iterator.prevToken);
    
                    while (true) {
                        let batch = await pool.query('SELECT batchesTypes_id AS type, batches_body AS body, batches_prevToken AS prevToken FROM `batches` WHERE batches_token = ?', [ prevTokenBatch[0] ]);
                        batch = JSON.parse(JSON.stringify(batch));
    
                        if (batch[0].type == 1 || batch[0].type == 4) {
                            let body = JSON.parse(batch[0].body);
    
                            if (batch[0].type == 4) {
                                let fingerling = body.fingerlings;
            
                                let fingerlingData = await pool.query('SELECT specie_id AS specie FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ?', [ fingerling[0] ]);
                                fingerlingData = JSON.parse(JSON.stringify(fingerlingData));
                                
                                body.specie = fingerlingData[0].specie;
                            }
                            
                            iterator.specie = await spececieName(body.specie) ?? "";
                            iterator.serial = body.serial;
    
                            iterator.type = undefined;
                            iterator.body = undefined;
                            iterator.prevToken = undefined;
    
                            break
                        }else{
                            prevTokenBatch = iterator.prevToken;
                            continue;
                        }
                    }
                }   
            }

            // Se agrega al objeto de lotes
            batches.batchesPackOff = batchesPackOff;
        }

        res.status(200).json({batches});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener lote especifico de una unidad productiva
controller.getBatch = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), query("token").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // Se obtiene el ID de la unidad productiva y el token
        const productiveUnitId = req.query.productiveUnitId;
        const token = req.query.token;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["lotes", "despachos"])) throw `Esta unidad productiva no pertenece a este usuario.`;
        
        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se obtiene la información del lote
        let batch = await pool.query('SELECT batchesTypes_id AS type, batches_prevToken AS prevToken, batches_packOff AS packOff, batches_date AS date, batches_body AS body FROM `batches` WHERE batches_token = ?', [ token ]);
        batch = JSON.parse(JSON.stringify(batch));

        if (!batch.length > 0) throw `El lote '${token}' no existe.`;

        // Se construye la trazabilidad
        let batchData = await constructTraceability(token, batch[0].type, batch[0].body, batch[0].prevToken);

        res.status(200).json({batchData});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Generar serial para lote
controller.generateSerial = [verifyToken(config), async(req, res) => {
    const randomSerial = generaterRandomSerial(2);

    res.status(200).json({"serial": randomSerial});
}];

// Obtener metodos de embalaje
controller.packaging = [verifyToken(config), query("productiveUnit").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // Se obtiene el ID de la unidad productiva para filtrar los metodos de embalaje
        const productiveUnitId = req.query.productiveUnit;

        let packaging = await pool.query('SELECT b.packaging_id AS id, b.packaging_name AS name FROM `productiveUnits` AS a LEFT JOIN packaging AS b ON b.productiveUnits_types_id = a.productiveUnits_types_id WHERE a.productiveUnits_id = ?', [ productiveUnitId ]);
        packaging = JSON.parse(JSON.stringify(packaging));

        res.status(200).json({packaging});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener historial de transportadores
controller.shippersHistory = [verifyToken(config), query("productiveUnit").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // Se obtiene el ID de la unidad productiva para filtrar los metodos de embalaje
        const productiveUnitId = req.query.productiveUnit;

        let shippers = await pool.query('SELECT `productiveUnits_historyShippers_body` AS body FROM `productiveUnits_historyShippers` WHERE productiveUnits_id = ?', [ productiveUnitId ]);
        shippers = JSON.parse(JSON.stringify(shippers));

        res.status(200).json({shippers});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener historial de clientes
controller.customersHistory = [verifyToken(config), query("productiveUnit").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // Se obtiene el ID de la unidad productiva para filtrar los metodos de embalaje
        const productiveUnitId = req.query.productiveUnit;

        let customers = await pool.query('SELECT `productiveUnits_customersHistory_body` AS body FROM `productiveUnits_customersHistory` WHERE productiveUnits_id = ?', [ productiveUnitId ]);
        customers = JSON.parse(JSON.stringify(customers));

        res.status(200).json({customers});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Generar despacho
controller.dispatch = [verifyToken(config), body("productiveUnit").notEmpty().isInt(), body("token").notEmpty(), body("quantityFish").notEmpty().isInt(), body("discontinue").notEmpty().isBoolean(), body("shipper").notEmpty(), body("packaging").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.body.productiveUnit;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["despachos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se obtiene y se valida que el lote sea válido
        const token = req.body.token;
        const quantityFish = req.body.quantityFish;
        
        let batch = await pool.query('SELECT batchesTypes_id AS type, batches_prevToken AS prevToken, batches_packOff AS packOff, batches_date AS date, batches_body AS body FROM `batches` WHERE batches_token = ?', [ token ]);
        batch = JSON.parse(JSON.stringify(batch));

        if (!batch.length > 0) throw `El lote '${token}' no existe.`;

        if (batch[0].packOff == 2) throw `El lote '${token}' está descontinuado o completamente despachado.`;

        // Se verifica si el lote cuenta con la cantidad de individuos a despachar
        let bodyMainBatch = JSON.parse(batch[0].body);

        if (batch[0].type == 1 || batch[0].type == 2 || batch[0].type == 3) {
            if (parseInt(quantityFish) > parseInt(bodyMainBatch.quantityFishIterator)) throw `El lote '${token}' no cuenta con la cantidad de individuos necesaria. Faltan ${Math.abs(bodyMainBatch.quantityFishIterator-quantityFish)}`;
        }

        if (batch[0].type == 4 || batch[0].type == 5 || batch[0].type == 6) {
            if (parseInt(quantityFish) > parseInt(bodyMainBatch.weightIterator)) throw `El lote '${token}' no cuenta con la cantidad de individuos necesaria. Faltan ${Math.abs(bodyMainBatch.weightIterator-quantityFish)}`;
        }

        // Se verifica si se mandó ID del cliente
        if (req.body.clientId) {
            const clientId = req.body.clientId;

            // Se busca el hash del usuario para consultar su información
            let clientData = await pool.query(`SELECT b.users_code AS code, JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(productiveUnits_body, CONCAT('$.profile.' ,JSON_UNQUOTE(JSON_EXTRACT(JSON_KEYS(JSON_EXTRACT(productiveUnits_body, "$.profile"), "$[0]"), "$[0]"))))), "$.name")) AS name, JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(productiveUnits_body, CONCAT('$.profile.' ,JSON_UNQUOTE(JSON_EXTRACT(JSON_KEYS(JSON_EXTRACT(productiveUnits_body, "$.profile"), "$[0]"), "$[0]"))))), "$.email")) AS email FROM productiveUnits AS a LEFT JOIN users AS b ON b.users_id = a.users_id WHERE a.productiveUnits_id =  ?`, [ clientId ]);  
            clientData = JSON.parse(JSON.stringify(clientData));

            let userData = await fetch(config.apisRouteRedAzul+"/users/data?userHash="+clientData[0].code,{
                method: "GET",
                headers: { "Authorization": config.authRedAzul }
            }).then(async response => { 
                if (response.ok) {
                    return await response.json();
                } else {
                    return {};
                }
            })

            // Se parse el perfil del usuario
            userData = userData.userData;

            // Se el usuario no tiene departamento se extrae el departamento según la ciudad
            if (!userData.department) {
                let city = await fetch(config.apisRouteRedAzul+"/general/cities?id="+userData.city,{
                    method: "GET",
                    headers: { "Authorization": config.authRedAzul }
                }).then(async response => { 
                    if (response.ok) {
                        return await response.json();
                    } else {
                        return {};
                    }
                })

                userData.department = city.cities[0].regions_id;
            }

            // Se extrae el país del usuario
            let country = await fetch(config.apisRouteRedAzul+"/general/regions?id="+userData.department,{
                method: "GET",
                headers: { "Authorization": config.authRedAzul }
            }).then(async response => { 
                if (response.ok) {
                    return await response.json();
                } else {
                    return {};
                }
            })

            // Se parsea el país para obtener solo el ID
            country = country.regions[0].countries_id;

            // Se construye el objeto client
            client = {
                name: clientData[0].name,
                email: clientData[0].email,
                documentType: userData.documentType,
                documentNumber: userData.documentNumber,
                country,
                id: clientId
            }
        }else{
            // Se obtiene el objeto con los datos
            client = req.body.client;

            // Se parsea el objeto
            client = JSON.parse(client);

            // Se verifica que tenga todos los datos
            if (!client.hasOwnProperty("name")) throw "Todos los datos del cliente son obligatorios. Falta name";
            if (!client.hasOwnProperty("country")) throw "Todos los datos del cliente son obligatorios. Falta country";
            if (!client.hasOwnProperty("documentType")) throw "Todos los datos del cliente son obligatorios. Falta name";
            if (!client.hasOwnProperty("documentNumber")) throw "Todos los datos del cliente son obligatorios. Falta documentNumber";
            if (!client.hasOwnProperty("email")) throw "Todos los datos del cliente son obligatorios. Falta email";
        }

        // Se verifica que el transportador tenga todos los datos
        shipper = req.body.shipper;
        shipper = JSON.parse(shipper);

        if (!shipper.hasOwnProperty("name")) throw "Todos los datos del transportador son obligatorios. Falta name";
        if (!shipper.hasOwnProperty("documentNumber")) throw "Todos los datos del transportador son obligatorios. Falta documentNumber";
        if (!shipper.hasOwnProperty("licensePlate")) throw "Todos los datos del transportador son obligatorios. Falta licensePlate";
        if (!shipper.hasOwnProperty("departureDate")) throw "Todos los datos del transportador son obligatorios. Falta departureDate";
        if (!shipper.hasOwnProperty("email")) throw "Todos los datos del transportador son obligatorios. Falta email";

        const packaging = req.body.packaging;

        // Se verifica que el metodo de embalaje sea válido
        let productiveUnitType = await pool.query('SELECT productiveUnits_types_id AS type FROM `productiveUnits` WHERE productiveUnits_id = ?', [ productiveUnitId ]);
        productiveUnitType = JSON.parse(JSON.stringify(productiveUnitType));

        let validPackaging = await pool.query('SELECT * FROM `packaging` WHERE packaging_id = ? AND productiveUnits_types_id = ?', [ packaging, productiveUnitType[0].type ]);
        validPackaging = JSON.parse(JSON.stringify(validPackaging));

        if (!validPackaging.length > 0) throw `El metodo de embalaje no existe o no está permitido para esta unidad productiva.`;

        let packagingName = validPackaging[0].packaging_name;

        // Se construye el objeto dispatch
        let dispatch = {
            client,
            quantityFish,
            shipper,
            packaging,
            note: req.body.note ?? ""
        }

        let newQuantity = 0;
        // Se calcula la nueva cantidad de individuos
        if (batch[0].type == 1 || batch[0].type == 2 || batch[0].type == 3) {
            newQuantity = parseInt(bodyMainBatch.quantityFishIterator)-parseInt(quantityFish);
        }

        if (batch[0].type == 4 || batch[0].type == 5 || batch[0].type == 6) {
            newQuantity = parseInt(bodyMainBatch.weightIterator)-parseInt(quantityFish);
        }

        // Se crea el token del despacho
        let dispatchToken = generaterDispatchToken();

        // Se verifica si hay que descontinuar el lote
        if (req.body.discontinue == "true" || newQuantity < 1) {
            //Se guarda el despacho
            let dispatchQuery = await pool.query('INSERT INTO `dispatch`(`dispatch_token`, `batches_token`, `dispatch_body`) VALUES (?, ?, ?)', [ dispatchToken, token, JSON.stringify(dispatch) ]);

            if (batch[0].type == 1 || batch[0].type == 2 || batch[0].type == 3) {
                await pool.query(`UPDATE batches SET batches_body = JSON_SET(batches_body, "$.quantityFishIterator", ?), batches_body = JSON_SET( IFNULL(batches_body, '{}'), '$.dispatches', JSON_ARRAY_APPEND( IFNULL(JSON_EXTRACT(batches_body, '$.dispatches'), '[]'), '$', ? ) ), batches_packOff = 2 WHERE batches_token = ?`, [ newQuantity, dispatchQuery.insertId, token ]);
            }

            if (batch[0].type == 4|| batch[0].type == 5 || batch[0].type == 6) {
                await pool.query(`UPDATE batches SET batches_body = JSON_SET(batches_body, "$.weightIterator", ?), batches_body = JSON_SET( IFNULL(batches_body, '{}'), '$.dispatches', JSON_ARRAY_APPEND( IFNULL(JSON_EXTRACT(batches_body, '$.dispatches'), '[]'), '$', ? ) ), batches_packOff = 2 WHERE batches_token = ?`, [ newQuantity, dispatchQuery.insertId, token ]);
            }
        } else {
            let dispatchQuery = await pool.query('INSERT INTO `dispatch`(`dispatch_token`, `batches_token`, `dispatch_body`) VALUES (?, ?, ?)', [ dispatchToken, token, JSON.stringify(dispatch) ]);

            if (batch[0].type == 1 || batch[0].type == 2 || batch[0].type == 3) {
                await pool.query(`UPDATE batches SET batches_body = JSON_SET(batches_body, "$.quantityFishIterator", ?), batches_body = JSON_SET( IFNULL(batches_body, '{}'), '$.dispatches', JSON_ARRAY_APPEND( IFNULL(JSON_EXTRACT(batches_body, '$.dispatches'), '[]'), '$', ? ) ), batches_packOff = 1 WHERE batches_token = ?`, [ newQuantity, dispatchQuery.insertId, token ]);
            }

            if (batch[0].type == 4|| batch[0].type == 5 || batch[0].type == 6) {
                await pool.query(`UPDATE batches SET batches_body = JSON_SET(batches_body, "$.weightIterator", ?), batches_body = JSON_SET( IFNULL(batches_body, '{}'), '$.dispatches', JSON_ARRAY_APPEND( IFNULL(JSON_EXTRACT(batches_body, '$.dispatches'), '[]'), '$', ? ) ), batches_packOff = 1 WHERE batches_token = ?`, [ newQuantity, dispatchQuery.insertId, token ]);
            }
        }

        // Se verifica si hay que guardar al transportador
        let alredyShipper = await pool.query('SELECT * FROM `productiveUnits_historyShippers` WHERE JSON_EXTRACT(productiveUnits_historyShippers_body, "$.documentNumber") = ?', [ shipper.documentNumber ]);
        alredyShipper = JSON.parse(JSON.stringify(alredyShipper));

        if (alredyShipper.length < 1) {
            await pool.query('INSERT INTO `productiveUnits_historyShippers`(`productiveUnits_id`, `productiveUnits_historyShippers_body`) VALUES (?, ?)', [ productiveUnitId, JSON.stringify(shipper) ]);
        }

        // Se verifica si hay que guardar al cliente
        let alredyCustomer = await pool.query('SELECT * FROM `productiveUnits_customersHistory` WHERE JSON_EXTRACT(productiveUnits_customersHistory_body, "$.documentNumber") = ?', [ client.documentNumber ]);
        alredyCustomer = JSON.parse(JSON.stringify(alredyCustomer));

        if (alredyCustomer.length < 1) {
            await pool.query('INSERT INTO `productiveUnits_customersHistory`(`productiveUnits_id`, `productiveUnits_customersHistory_body`) VALUES (?, ?)', [ productiveUnitId, JSON.stringify(client) ]);
        }
        
        // Se obtiene el ID de la unidad productiva que despacha
        let userProductiveId = await pool.query(`SELECT users_id AS id, JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(productiveUnits_body, CONCAT('$.profile.' ,JSON_UNQUOTE(JSON_EXTRACT(JSON_KEYS(JSON_EXTRACT(productiveUnits_body, "$.profile"), "$[0]"), "$[0]"))))), "$.name")) AS name, JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(productiveUnits_body, CONCAT('$.profile.' ,JSON_UNQUOTE(JSON_EXTRACT(JSON_KEYS(JSON_EXTRACT(productiveUnits_body, "$.profile"), "$[0]"), "$[0]"))))), "$.phone")) AS phone FROM productiveUnits WHERE productiveUnits_id = ?`, [ productiveUnitId ]);
        userProductiveId = JSON.parse(JSON.stringify(userProductiveId));

        let userDataProductive = await fetch(config.apisRoute+"/users/otherData?user="+userProductiveId[0].id,{
            method: "GET",
            headers: { "Authorization": config.trazulKey }
        }).then(async response => {
            if (response.ok) {
                return await response.json();
            } else {
                return {};
            }
        });

        emailProductive = userDataProductive.userData.email;

        // Se obtiene el nombre de la especie a despachar
        let specieBatch = "";
        if (batch[0].type == 1 || batch[0].type == 4) {
            specieBatch = bodyMainBatch.specie;
        }else{
            let prevTokens = JSON.parse(batch[0].prevToken);
            let speciePrevBatch = await pool.query('SELECT batches_body AS body FROM `batches` WHERE batches_token = ?', [ prevTokens[0] ]);
            speciePrevBatch = JSON.parse(JSON.stringify(speciePrevBatch));

            specieBatch = JSON.parse(speciePrevBatch[0].body);

            specieBatch = specieBatch.specie;
        }

        let specieData = await fetch(config.apisRoute+"/general/species?flag="+specieBatch,{
            method: "GET"
        }).then(async response => {
            if (response.ok) {
                return await response.json();
            } else {
                return {};
            }
        })
        
        // Se obtiene la fecha actual
        let now = new Date();

        // Se obtiene día, mes y año
        var day = now.getDate();
        var month = now.getMonth() + 1; // Se suma 1 porque los meses van de 0 a 11
        var year = now.getFullYear();

        now = day + '/' + month + '/' + year;

        // Se envían los correos
        // Correo para dueño de la unidad productiva
        sendMail(emailProductive, `Despacho de lote: ${token}`, {user: emailProductive, batchToken: token, dispatchToken}, "notifyDispatch1");

        // Correo para cliente
        sendMail(client.email, `Has recibido un lote por parte de "${userProductiveId[0].name}"`, {user: client.email, productiveUnitName: userProductiveId[0].name, token, quantity: quantityFish, unit: "Individuos", specieName: specieData.speciesTypes.vulgarName}, "notifyDispatch2");

        // Correo transportador
        sendMail(shipper.email, `${userProductiveId[0].name} te ha agregado como transportador de un lote`, {user: shipper.email, productiveUnitName: userProductiveId[0].name, productiveUnitPhone: userProductiveId[0].phone, packaging: packagingName, dispatchDate: now}, "notifyDispatch3");

        res.status(200).json({tokenTrazability: token, tokenDispatch: dispatchToken});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener despachos
controller.dispatches = [verifyToken(config), query("productiveUnit").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnit;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["despachos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        let dispatches = await pool.query('SELECT a.dispatch_id AS id, a.dispatch_token AS tokenDispatch, JSON_EXTRACT(dispatch_body, "$.client.name") AS name, dispatch_date AS date FROM `dispatch` AS a LEFT JOIN batches AS b ON b.batches_token = a.batches_token WHERE b.batches_productiveUnit = ?', [ productiveUnitId ]);
        dispatches = JSON.parse(JSON.stringify(dispatches));

        res.status(200).json({dispatches});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener despachos
controller.specificDispatch = [verifyToken(config), query("productiveUnit").notEmpty().isInt(), query("dispatch").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnit;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["despachos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // ID del despacho
        const dispatchId = req.query.dispatch;

        let dispatch = await pool.query('SELECT a.dispatch_token AS tokenDispatch, a.batches_token AS batchToken, a.dispatch_body AS body, dispatch_state AS state, dispatch_date AS date FROM `dispatch` AS a LEFT JOIN batches AS b ON b.batches_token = a.batches_token WHERE b.batches_productiveUnit = ? AND a.dispatch_id = ?', [ productiveUnitId, dispatchId ]);
        dispatch = JSON.parse(JSON.stringify(dispatch));

        dispatch[0].body = JSON.parse(dispatch[0].body);

        // Se traduce el ID del metodo de embalaje a nombre
        let packaging = await pool.query('SELECT packaging_name AS name FROM `packaging` WHERE packaging_id = ?', [ dispatch[0].body.packaging ]);
        packaging = JSON.parse(JSON.stringify(packaging));

        dispatch[0].body.packaging = packaging[0].name;

        let idDoc = dispatch[0].body.client.documentType ?? 9;

        // Se traduce el tipo de documento del cliente
        let document = await fetch(config.apisRoute+"/general/documentTypes?flag="+idDoc,{
            method: "GET"
        }).then(async response => {
            if (response.ok) {
                return await response.json();
            } else {
                return {};
            }
        });

        dispatch[0].body.client.documentType = document.documents[0].document_types_name;

        // Se traduce el tipo de documento del cliente
        let country = await fetch(config.apisRoute+"/general/countries?id="+dispatch[0].body.client.country,{
            method: "GET"
        }).then(async response => {
            if (response.ok) {
                return await response.json();
            } else {
                return {};
            }
        });

        dispatch[0].body.client.country = country.countries[0].countries_name;

        res.status(200).json({dispatch});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Trazabilidad de un lote
controller.traceability = [verifyToken(config), query("productiveUnit").optional().isInt(), query("token").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnit ?? "";

        if (productiveUnitId != "") {
             // ID del usuario
            const userId = await getUserId(req);

            // se verifica que la unidad productiva pertenezca al usuario
            // if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["trazabilidad"])) throw `Esta unidad productiva no pertenece a este usuario.`;

            // se verifica que la unidad productiva se encuentre activa
            if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;
        }   

        // Array para construir la trazabilidad
        let traceability = [];

        // Token principal de la cadena
        const mainToken = req.query.token;

        // Se obtienen los datos del token principal
        let mainBatch = await pool.query('SELECT batches_id AS id, batchesTypes_id AS type, batches_prevToken AS prevToken, batches_body AS body, batches_packOff AS packOff, batches_date AS date, batches_productiveUnit AS productiveUnit FROM `batches` WHERE batches_token = ?', [ mainToken ]);
        mainBatch = JSON.parse(JSON.stringify(mainBatch));

        if (mainBatch.length < 1) throw `El lote ${mainToken} no existe o no es de esta unidad productiva.`;

        let batchData = await constructTraceability(mainToken, mainBatch[0].type, mainBatch[0].body, mainBatch[0].prevToken);

        // Se obtiene la ubicación de la granja
        let productiveUnitData = await pool.query(`SELECT JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(productiveUnits_body, CONCAT('$.profile.' ,JSON_UNQUOTE(JSON_EXTRACT(JSON_KEYS(JSON_EXTRACT(productiveUnits_body, "$.profile"), "$[0]"), "$[0]"))))), "$.coords")) AS coords FROM productiveUnits WHERE productiveUnits_id = ?`, [ mainBatch[0].productiveUnit ]);
        productiveUnitData = JSON.parse(JSON.stringify(productiveUnitData));

        if (productiveUnitData.length > 0) {
            batchData.coords = productiveUnitData[0].coords;
        }else{
            batchData.coords = null;
        }
        

        // TRAZABILIDAD PARA LOTE DE ALEVINERA BÁSICO
        if (mainBatch[0].type == 1) {
            // Se verifica si el lote es padre de otro lote
            let childLots = await pool.query(`SELECT batches_token AS token, batchesTypes_id AS type, batches_date AS date FROM batches WHERE JSON_CONTAINS(batches_prevToken, '"${mainToken}"', "$")`);
            childLots = JSON.parse(JSON.stringify(childLots));

            // Se obtienen los despachos y los transportadores
            let dispatches = await pool.query('SELECT dispatch_token AS token, dispatch_body AS body FROM `dispatch` WHERE batches_token = ?', [ mainToken ]);
            dispatches = JSON.parse(JSON.stringify(dispatches));

            // Se iteran los despachos
            let dispatchesParsed = [];
            let shippers = [];
            for (element of dispatches) {
                element = JSON.parse(element.body);

                // Se traducen los valores ID a nombre
                element.client.country = await getCountryName(element.client.country);

                element.client.documentType = await getDocumentTypeName(element.client.documentType ?? 9);

                await dispatchesParsed.push(element.client);
                await shippers.push(element.shipper);
            };

            // Se iteran los despachos de los lotes hijos
            for (element of childLots) {
                // Se obtienen los despachos y los transportadores
                let dispatches = await pool.query('SELECT dispatch_token AS token, dispatch_body AS body FROM `dispatch` WHERE batches_token = ?', [element.token]);
                dispatches = JSON.parse(JSON.stringify(dispatches));
        
                for (element of dispatches) {
                    element = JSON.parse(element.body);
    
                    // Se traducen los valores ID a nombre
                    element.client.country = await getCountryName(element.client.country);
    
                    element.client.documentType = await getDocumentTypeName(element.client.documentType ?? 9);
    
                    await dispatchesParsed.push(element.client);
                    await shippers.push(element.shipper);
                };
            }

            traceability.push({type: 1, body: batchData});

            traceability.push({type: 3, body: childLots});

            traceability.push({type: 4, body: shippers});

            traceability.push({type: 5, body: dispatchesParsed});
        }

        // TRAZABILIDAD PARA LOTE DE ALEVINERA DERIVADO
        if (mainBatch[0].type == 2) {
            // Se obtiene el lote previo
            let fatherBatch = await pool.query('SELECT batches_token AS token, batchesTypes_id AS type, batches_date AS date FROM `batches` WHERE batches_token = ?', [ batchData.prevBatches[0].token ]);
            fatherBatch = JSON.parse(JSON.stringify(fatherBatch));

            // Se elimina el prevBatches del body
            batchData.prevBatches = undefined;

            // Se obtienen los despachos y los transportadores
            let dispatches = await pool.query('SELECT dispatch_token AS token, dispatch_body AS body FROM `dispatch` WHERE batches_token = ?', [ mainToken ]);
            dispatches = JSON.parse(JSON.stringify(dispatches));

            // Se iteran los despachos
            let dispatchesParsed = [];
            let shippers = [];
            for (element of dispatches) {
                element = JSON.parse(element.body);

                // Se traducen los valores ID a nombre
                element.client.country = await getCountryName(element.client.country);

                element.client.documentType = await getDocumentTypeName(element.client.documentType ?? 9);

                await dispatchesParsed.push(element.client);
                await shippers.push(element.shipper);
            };

            traceability.push({type: 1, body: batchData});

            traceability.push({type: 2, body: fatherBatch});

            traceability.push({type: 4, body: shippers});

            traceability.push({type: 5, body: dispatchesParsed});
        }

        // TRAZABILIDAD PARA LOTE DE ALEVINERA MEZCLADO
        if (mainBatch[0].type == 3) {
            let fatherBatch = batchData.prevBatches;

            // Se obtienen los despachos y los transportadores
            let dispatches = await pool.query('SELECT dispatch_token AS token, dispatch_body AS body FROM `dispatch` WHERE batches_token = ?', [ mainToken ]);
            dispatches = JSON.parse(JSON.stringify(dispatches));

            // Se iteran los despachos
            let dispatchesParsed = [];
            let shippers = [];
            for (element of dispatches) {
                element = JSON.parse(element.body);

                // Se traducen los valores ID a nombre
                element.client.country = await getCountryName(element.client.country);

                element.client.documentType = await getDocumentTypeName(element.client.documentType ?? 9);

                await dispatchesParsed.push(element.client);
                await shippers.push(element.shipper);
            };

            // Se iteran los despachos de los lotes padres
            for (const element of fatherBatch) {
                // Se obtienen los despachos y los transportadores
                let dispatches = await pool.query('SELECT dispatch_token AS token, dispatch_body AS body FROM `dispatch` WHERE batches_token = ?', [element.token]);
                dispatches = JSON.parse(JSON.stringify(dispatches));
        
                for (elementB of dispatches) {
                    elementB = JSON.parse(elementB.body);
    
                    // Se traducen los valores ID a nombre
                    elementB.client.country = await getCountryName(elementB.client.country);

                    if (elementB.client.documentType == undefined) {
                        elementB.client.documentType = 9;
                    }
    
                    elementB.client.documentType = await getDocumentTypeName(elementB.client.documentType);
    
                    await dispatchesParsed.push(elementB.client);
                    await shippers.push(elementB.shipper);
                };
            }

            traceability.push({type: 1, body: batchData});

            traceability.push({type: 2, body: fatherBatch});

            traceability.push({type: 4, body: shippers});

            traceability.push({type: 5, body: dispatchesParsed});
        }

        // TRAZABILIDAD PARA LOTE DE ENGORDE BÁSICO
        if (mainBatch[0].type == 4) {
            // Se obtienen los despachos y los transportadores
            let dispatches = await pool.query('SELECT dispatch_token AS token, dispatch_body AS body FROM `dispatch` WHERE batches_token = ?', [ mainToken ]);
            dispatches = JSON.parse(JSON.stringify(dispatches));

            // Se iteran los despachos
            let dispatchesParsed = [];
            let shippers = [];
            for (element of dispatches) {
                element = JSON.parse(element.body);

                // Se traducen los valores ID a nombre
                element.client.country = await getCountryName(element.client.country);

                element.client.documentType = await getDocumentTypeName(element.client.documentType ?? 9);

                await dispatchesParsed.push(element.client);
                await shippers.push(element.shipper);
            };

            // Se obtienen los alevinos
            let fingerlingsMain = batchData.fingerlings;
            let fingerling = [];

            fingerlingsMain.forEach(element => {
                if (element.token != null) {
                    fingerling.push(element);
                }
            });

            traceability.push({type: 1, body: batchData});

            traceability.push({type: 6, body: fingerling});

            traceability.push({type: 4, body: shippers});

            traceability.push({type: 5, body: dispatchesParsed});
        }

        // TRAZABILIDAD PARA LOTE DE ENGORDE DERIVADO
        if (mainBatch[0].type == 5) {
            // Se obtiene el lote previo
            let fatherBatch = await pool.query('SELECT batches_token AS token, batchesTypes_id AS type, batches_date AS date FROM `batches` WHERE batches_token = ?', [ batchData.prevBatches[0].token ]);
            fatherBatch = JSON.parse(JSON.stringify(fatherBatch));

            // Se elimina el prevBatches del body
            batchData.prevBatches = undefined;

            // Se obtienen los despachos y los transportadores
            let dispatches = await pool.query('SELECT dispatch_token AS token, dispatch_body AS body FROM `dispatch` WHERE batches_token = ?', [ mainToken ]);
            dispatches = JSON.parse(JSON.stringify(dispatches));

            // Se iteran los despachos
            let dispatchesParsed = [];
            let shippers = [];
            for (element of dispatches) {
                element = JSON.parse(element.body);

                // Se traducen los valores ID a nombre
                element.client.country = await getCountryName(element.client.country);

                element.client.documentType = await getDocumentTypeName(element.client.documentType ?? 9);

                await dispatchesParsed.push(element.client);
                await shippers.push(element.shipper);
            };

            // Se obtienen los alevinos
            let fingerlingsMain = batchData.fingerlings;
            let fingerling = [];

            fingerlingsMain.forEach(element => {
                if (element.token != null) {
                    fingerling.push(element);
                }
            });

            traceability.push({type: 1, body: batchData});

            traceability.push({type: 2, body: fatherBatch});

            traceability.push({type: 6, body: fingerling});

            traceability.push({type: 4, body: shippers});

            traceability.push({type: 5, body: dispatchesParsed});
        }

        // TRAZABILIDAD PARA LOTE DE ENGORDE MEZCLADO
        if (mainBatch[0].type == 6) {
            let fatherBatch = batchData.prevBatches;

            // Se obtienen los despachos y los transportadores
            let dispatches = await pool.query('SELECT dispatch_token AS token, dispatch_body AS body FROM `dispatch` WHERE batches_token = ?', [ mainToken ]);
            dispatches = JSON.parse(JSON.stringify(dispatches));

            // Se iteran los despachos
            let dispatchesParsed = [];
            let shippers = [];
            for (element of dispatches) {
                element = JSON.parse(element.body);

                // Se traducen los valores ID a nombre
                element.client.country = await getCountryName(element.client.country);

                element.client.documentType = await getDocumentTypeName(element.client.documentType ?? 9);

                await dispatchesParsed.push(element.client);
                await shippers.push(element.shipper);
            };

            // Se iteran los despachos de los lotes padres
            for (const element of fatherBatch) {
                // Se obtienen los despachos y los transportadores
                let dispatches = await pool.query('SELECT dispatch_token AS token, dispatch_body AS body FROM `dispatch` WHERE batches_token = ?', [element.token]);
                dispatches = JSON.parse(JSON.stringify(dispatches));
        
                for (elementB of dispatches) {
                    elementB = JSON.parse(elementB.body);
    
                    // Se traducen los valores ID a nombre
                    elementB.client.country = await getCountryName(elementB.client.country);

                    if (elementB.client.documentType == undefined) {
                        elementB.client.documentType = 9;
                    }
    
                    elementB.client.documentType = await getDocumentTypeName(elementB.client.documentType);
    
                    await dispatchesParsed.push(elementB.client);
                    await shippers.push(elementB.shipper);
                };
            }

            // Se obtienen los alevinos
            let fingerlingsMain = batchData.fingerlings;
            let fingerling = [];

            fingerlingsMain.forEach(element => {
                if (element.token != null) {
                    fingerling.push(element);
                }
            });

            traceability.push({type: 1, body: batchData});

            traceability.push({type: 2, body: fatherBatch});

            traceability.push({type: 6, body: fingerling});

            traceability.push({type: 4, body: shippers});

            traceability.push({type: 5, body: dispatchesParsed});
        }

        res.status(200).json({traceability});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Trazabilidad de un lote
controller.aquacode = [verifyToken(config), query("token").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // Se obtiene el token
        let token = req.query.token;

        let mainBatch = await pool.query('SELECT batches_productiveUnit AS punit, batchesTypes_id AS type FROM `batches` WHERE batches_token = ?', [ token ]);
        mainBatch = JSON.parse(JSON.stringify(mainBatch));

        if (!mainBatch.length > 0) `El lote ${token} no existe`;

        // Objeto de trazabilidad
        let traceability = [];

        await fetch(config.apisRoute+"/productiveUnits/batches/traceability?token="+token, {
            method: "GET",
            headers: { "Authorization": config.trazulKey }
        }).then(async response => { 
            if (response.ok) {
                let data = await response.json();

                data = data.traceability;

                traceability.push({ type: mainBatch[0].type, data});
            } else {
                throw await response.json();
            }
        }).catch(err => {
            console.log(err);
            throw err;
        })
        
        // Lote de alevinera principal
        if (mainBatch[0].type == 4 || mainBatch[0].type == 5 || mainBatch[0].type == 6) {
            let fingerlings = traceability[0].data[0].body.fingerlings ?? [];

            if (fingerlings.length > 0) {
                let token = fingerlings[0].token ?? undefined;

                let iteratorBatch = await pool.query('SELECT batches_productiveUnit AS punit, batchesTypes_id AS type FROM `batches` WHERE batches_token = ?', [ token ]);
                iteratorBatch = JSON.parse(JSON.stringify(iteratorBatch));

                await fetch(config.apisRoute+"/productiveUnits/batches/traceability?token="+token, {
                    method: "GET",
                    headers: { "Authorization": config.trazulKey }
                }).then(async response => { 
                    if (response.ok) {
                        let data = await response.json();
        
                        data = data.traceability;
        
                        traceability.unshift({ type: iteratorBatch[0].type, data });
                    } else {
                        throw await response.json();
                    }
                }).catch(err => {
                    console.log(err);
                    throw err;
                })
            }

        }

        res.status(200).json({traceability});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

module.exports = controller;