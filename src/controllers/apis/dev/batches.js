// Configuración de las API's
const config = require("./configApis");

// Librerias
const pool = require("../../../config/dbConnections"+config.DBName);
const fetch = require('node-fetch');
const verifyToken = require("./../../../helpers/auth");
const { genRandomNumberCode, genRandomString } = require('../../../helpers/randomString');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../../../helpers/hasErrorsResults');
const {sendMail} = require("../../../helpers/emails/index");
const { validProductiveUnitType, getUserId, userOwnerProductiveUnit, getUserHash, productiveUnitActive, constructTraceability, getCountryName, getDocumentTypeName } = require('./common/batches');
const { specieName, formatDate, ageUnit, broodstockData, feedData, medicineData, pondData, dispatchData, fingerlingsData } = require("./common/batchesAux");
const { generaterRandomSerial, generaterBatchToken, generaterDispatchToken } = require('../../../helpers/serialTrazul');
const sharp = require('sharp');

// Controlador base
const controller = {};

// Obtener tipos de estados iniciales de un lote
controller.initialStates = [verifyToken(config), async(req, res) => {
    try {
        let initialStates = await pool.query('SELECT batchesInitialStates_id AS id, batchesInitialStates_name AS name, batchesInitialStates_images AS images FROM `batchesInitialStates`; ');
        initialStates = JSON.parse(JSON.stringify(initialStates));

        res.status(200).json({initialStates});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];


// Crear lote alevinera
controller.createBatchAlevinera = [verifyToken(config), body("initialState").notEmpty().isInt(), body("specie").notEmpty().isInt(), body("broodstock").notEmpty().isInt(), body("quantityFish").notEmpty().isInt(), body("sowingDate").notEmpty().isISO8601("yyyy-mm-dd").toDate(), body("minimumSize").optional().isFloat(), body("maximumSize").optional(), body("estimatedInitialHarvestDate").optional().isISO8601("yyyy-mm-dd").toDate(), body("estimatedIFinalHarvestDate").optional().isISO8601("yyyy-mm-dd").toDate(), body("harvestDate").optional().isISO8601("yyyy-mm-dd").toDate(), body("age").notEmpty().isInt(), body("ageUnit").notEmpty().isInt(), body("serial").notEmpty(), body("estimatedSalesPrice").optional().isInt(), body("description"), body("feed").notEmpty(), body("medicines").notEmpty(), body("ponds").notEmpty(), body("productiveUnit").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS POST
        const productiveUnitId = req.body.productiveUnit;
        const initialState = req.body.initialState;
        const specie = req.body.specie;
        const broodstock = req.body.broodstock;
        const quantityFish = req.body.quantityFish;
        const minimumSize = req.body.minimumSize ?? null;
        const maximumSize = req.body.maximumSize ?? null;
        const sowingDate = req.body.sowingDate ?? null;
        const estimatedInitialHarvestDate = req.body.estimatedInitialHarvestDate ?? null;
        const estimatedIFinalHarvestDate = req.body.estimatedIFinalHarvestDate ?? null;
        const harvestDate = req.body.harvestDate ?? null;
        const age = req.body.age;
        const ageUnit = req.body.ageUnit;
        const serial = req.body.serial;
        let estimatedSalesPrice = req.body.estimatedSalesPrice ?? null;
        const description = req.body.description ?? "";
        let feed = req.body.feed;
        let medicines = req.body.medicines;
        let ponds = req.body.ponds;
        let supplies = req.body.supplies;

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

        // Variable para guardar la query de estanques
        let queryPonds = "";

        // Se verifica que haya vinculado más de un estanque
        if (ponds.length < 1) throw "Es obligatorio asociar un estanque";

        // Se verifica que los estanques sean válidos y que el último no esté en uso por la misma especie
        for (let index = 0; index < ponds.length; index++) {
            const element = ponds[index];
            
            let validPond = await pool.query('SELECT productiveUnits_ponds_name AS name, productiveUnits_ponds_state AS state, productiveUnits_ponds_used AS used FROM `productiveUnits_ponds` WHERE productiveUnits_ponds_id = ? AND productiveUnits_id = ?', [ element[0], productiveUnitId ]); 
            validPond = JSON.parse(JSON.stringify(validPond));

            if (!validPond.length > 0) throw `El estanque '${element[0]}' no existe o no le pertenece a la granja`;

            if (validPond[0].state == 0) throw `El estanque '${element[0]}' se encuentra desactivado`;

            // Se verifica si el último estanque ya se encuentra en uso
            if (index === ponds.length - 1 && validPond[0].used == 1) throw `El estanque '${validPond[0].name}' ya se encuentra en uso`;
        }

        // Se parsean los medicamentos
        medicines = JSON.parse(medicines);

        // Variable para guardar la query de medicinas
        let queryMedicines = "";

        // Se verifica que los medicamentos sean válidos
        for (let index = 0; index < medicines.length; index++) {
            const element = medicines[index];

            const medicinesId = element[0];
            const medicinesQuantity = element[1];
            
            let validMedicine = await pool.query('SELECT productiveUnits_medicine_state AS state, productiveUnits_medicine_name AS name, productiveUnits_medicine_quantityAvailable AS available FROM `productiveUnits_medicine` WHERE productiveUnits_medicine_id = ? AND productiveUnits_id = ?', [ medicinesId, productiveUnitId ]); 
            validMedicine = JSON.parse(JSON.stringify(validMedicine));

            if (!validMedicine.length > 0) throw `El medicamento '${validMedicine[0].name}' no existe o no le pertenece a la granja`;

            if (validMedicine[0].state == 0) throw `El medicamento '${validMedicine[0].name}' se encuentra desactivado`;

            if (medicinesQuantity > validMedicine[0].available) throw `El medicamento '${validMedicine[0].name}}' no cuenta con la cantidad suficiente (${medicinesQuantity})`;

            element.push(validMedicine[0].available);
        }

        // Se parsean los piensos
        feed = JSON.parse(feed);

        // Variable para guardar la query de piensos
        let queryFeeds = "";

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

            element.push(validFeed[0].quantity);
        }

        // Se parsean los piensos
        supplies = JSON.parse(supplies);

        // Variable para guardar la query de piensos
        let querySupplies = "";

        // Se verifica que los piensos sean válidos y si se pueden agregar
        for (let index = 0; index < supplies.length; index++) {
            const element = supplies[index];

            const supplyId = element[0];
            const supplyQuantity = element[1];
            
            let validSupply = await pool.query('SELECT productiveUnits_supplies_state AS state, productiveUnits_supplies_quantityAvailable AS quantity FROM `productiveUnits_supplies` WHERE productiveUnits_supplies_id = ? AND productiveUnits_id = ?', [ supplyId, productiveUnitId ]); 
            validSupply = JSON.parse(JSON.stringify(validSupply));

            if (!validSupply.length > 0) throw `El insumo '${supplyId}' no existe o no le pertenece a la granja`;

            if (validSupply[0].state == 0) throw `El insumo '${supplyId}' se encuentra desactivado`;

            if (supplyQuantity > validSupply[0].quantity) throw `El insumo '${supplyId}' no cuenta con la cantidad suficiente (${supplyQuantity})`;

            element.push(validSupply[0].quantity);
        }

        // Se construye el JSON del body dependiento del estado inicial de lote
        let body = {
            productiveUnitId,
            initialState,
            specie,
            broodstock,
            quantityFish,
            quantityFishIterator: quantityFish,
            minimumSize,
            maximumSize,
            sowingDate,
            estimatedInitialHarvestDate,
            estimatedIFinalHarvestDate,
            harvestDate,
            age,
            ageUnit,
            serial,
            estimatedSalesPrice,
            description
        }

        // Se genera el token
        const token = generaterBatchToken(productiveUnitId, 1);

        // Se registra el lote
        let batch = await pool.query('INSERT INTO `batches`(`batches_token`, `batches_productiveUnit`, `batchesTypes_id`, `batches_body`, `batches_state`) VALUES (?, ?, ?, ?, ?)', [ token, productiveUnitId, 1, JSON.stringify(body), initialState ]);

        // Se registra el cambio de estado del último estanque asociado como "en uso"
        let lastPond = ponds[ponds.length - 1][0];
        await pool.query('UPDATE `productiveUnits_ponds` SET `productiveUnits_ponds_used`= 1 WHERE `productiveUnits_ponds_id` = ?', [ lastPond ]);

        // Se construye el query para estanques
        for (let index = 0; index < ponds.length; index++) {
            const element = ponds[index];

            queryPonds += `(${element[0]}, ${batch.insertId}, "${element[1]}"),`;
        }

        // Se elimina la última coma para evitar error en consuta
        if (queryPonds.endsWith(',')) {
            queryPonds = queryPonds.slice(0, -1);
        }
        
        // Se registran los estanques asociados
        await pool.query('INSERT INTO `batches_ponds`(`productiveUnits_ponds_id`, `batches_id`, `batches_ponds_useDate`) VALUES '+queryPonds);

        if (feed.length > 0) {
            // Se construye el query para piensos
            for (let index = 0; index < feed.length; index++) {
                const element = feed[index];

                queryFeeds += `(${batch.insertId}, ${element[0]}, "${element[1]}"),`;

                let newQuantity = element[2] - element[1];

                await pool.query('UPDATE `productiveUnits_feed` SET `productiveUnits_feed_quantityIterator` = ? WHERE `productiveUnits_feed_id` = ?', [ newQuantity, element[0] ]);
            }

            // Se elimina la última coma para evitar error en consuta
            if (queryFeeds.endsWith(',')) {
                queryFeeds = queryFeeds.slice(0, -1);
            }

            // Se registran los piensos asociados
            await pool.query('INSERT INTO `batches_feed`(`batches_id`, `productiveUnits_feed_id`, `batches_feed_quantity`) VALUES '+queryFeeds);
        }

        if (medicines.length > 0) {
            // Se construye el query para medicinas
            for (let index = 0; index < medicines.length; index++) {
                const element = medicines[index];

                queryMedicines += `(${batch.insertId}, ${element[0]}, "${element[1]}"),`;

                let newQuantity = element[2] - element[1];

                await pool.query('UPDATE `productiveUnits_medicine` SET `productiveUnits_medicine_quantityAvailable`= ? WHERE `productiveUnits_medicine_id` = ?', [ newQuantity, element[0] ]);
            }

            // Se elimina la última coma para evitar error en consuta
            if (queryMedicines.endsWith(',')) {
                queryMedicines = queryMedicines.slice(0, -1);
            }
            
            // Se registran los medicamentos asociados
            await pool.query('INSERT INTO `batches_medicines`(`batches_id`, `productiveUnits_medicine_id`, `batches_medicines_quantity`) VALUES '+queryMedicines);
        }

        if (supplies.length > 0) {
            // Se construye el query para medicinas
            for (let index = 0; index < supplies.length; index++) {
                const element = supplies[index];

                querySupplies += `(${batch.insertId}, ${element[0]}, "${element[1]}"),`;

                let newQuantity = element[2] - element[1];

                await pool.query('UPDATE `productiveUnits_supplies` SET `productiveUnits_supplies_quantityAvailable`= ? WHERE `productiveUnits_supplies_id` = ?', [ newQuantity, element[0] ]);
            }

            // Se elimina la última coma para evitar error en consuta
            if (querySupplies.endsWith(',')) {
                querySupplies = querySupplies.slice(0, -1);
            }
            
            // Se registran los medicamentos asociados
            await pool.query('INSERT INTO `batches_supplies`(`batches_id`, `productiveUnits_supplies_id`, `batches_supplies_quantity`) VALUES '+querySupplies);
        }

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
controller.createBatchEngorde = [verifyToken(config), body("weight").notEmpty().isFloat(), body("quantityFish").optional().isInt(), body("minimumSize").isInt(), body("maximumSize").isInt(), body("fingerlings").notEmpty(), body("serial").notEmpty(), body("description"), body("feed").notEmpty(), body("medicines").notEmpty(), body("ponds").notEmpty(), body("productiveUnit").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
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
        const initialState = req.body.initialState;
        const quantityFish = req.body.quantityFish;
        const minimumSize = req.body.minimumSize ?? null;
        const maximumSize = req.body.maximumSize ?? null;
        const sowingDate = req.body.sowingDate ?? null;
        const estimatedInitialHarvestDate = req.body.estimatedInitialHarvestDate ?? null;
        const estimatedIFinalHarvestDate = req.body.estimatedIFinalHarvestDate ?? null;
        const harvestDate = req.body.harvestDate ?? null;
        const serial = req.body.serial;
        const description = req.body.description ?? "";
        const weight = req.body.weight;
        let estimatedSalesPrice = req.body.estimatedSalesPrice ?? null;
        let feed = req.body.feed;
        let medicines = req.body.medicines;
        let ponds = req.body.ponds;
        let supplies = req.body.supplies;
        let fingerlings = req.body.fingerlings;

        // Se parsean los estanques
        ponds = JSON.parse(ponds);

        // Variable para guardar la query de estanques
        let queryPonds = "";

        // Se verifica que haya vinculado más de un estanque
        if (ponds.length < 1) throw "Es obligatorio asociar un estanque";

        // Se verifica que los estanques sean válidos y que el último no esté en uso
        for (let index = 0; index < ponds.length; index++) {
            const element = ponds[index];
            
            let validPond = await pool.query('SELECT productiveUnits_ponds_name AS name, productiveUnits_ponds_state AS state, productiveUnits_ponds_used AS used FROM `productiveUnits_ponds` WHERE productiveUnits_ponds_id = ? AND productiveUnits_id = ?', [ element[0], productiveUnitId ]); 
            validPond = JSON.parse(JSON.stringify(validPond));

            if (!validPond.length > 0) throw `El estanque '${element[0]}' no existe o no le pertenece a la granja`;

            if (validPond[0].state == 0) throw `El estanque '${element[0]}' se encuentra desactivado`;

            // Se verifica si el último estanque ya se encuentra en uso
            if (index === ponds.length - 1 && validPond[0].used == 1) throw `El estanque '${validPond[0].name}' ya se encuentra en uso`;
        }

        // Se parsean los medicamentos
        medicines = JSON.parse(medicines);

        // Variable para guardar la query de medicinas
        let queryMedicines = "";

        // Se verifica que los medicamentos sean válidos
        for (let index = 0; index < medicines.length; index++) {
            const element = medicines[index];

            const medicinesId = element[0];
            const medicinesQuantity = element[1];
            
            let validMedicine = await pool.query('SELECT productiveUnits_medicine_state AS state, productiveUnits_medicine_name AS name, productiveUnits_medicine_quantityAvailable AS available FROM `productiveUnits_medicine` WHERE productiveUnits_medicine_id = ? AND productiveUnits_id = ?', [ medicinesId, productiveUnitId ]); 
            validMedicine = JSON.parse(JSON.stringify(validMedicine));

            if (!validMedicine.length > 0) throw `El medicamento '${validMedicine[0].name}' no existe o no le pertenece a la granja`;

            if (validMedicine[0].state == 0) throw `El medicamento '${validMedicine[0].name}' se encuentra desactivado`;

            if (medicinesQuantity > validMedicine[0].available) throw `El medicamento '${validMedicine[0].name}}' no cuenta con la cantidad suficiente (${medicinesQuantity})`;

            element.push(validMedicine[0].available);
        }

        // Se parsean los piensos
        feed = JSON.parse(feed);

        // Variable para guardar la query de piensos
        let queryFeeds = "";

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

            element.push(validFeed[0].quantity);
        }

        // Se parsean los piensos
        supplies = JSON.parse(supplies);

        // Variable para guardar la query de piensos
        let querySupplies = "";

        // Se verifica que los piensos sean válidos y si se pueden agregar
        for (let index = 0; index < supplies.length; index++) {
            const element = supplies[index];

            const supplyId = element[0];
            const supplyQuantity = element[1];
            
            let validSupply = await pool.query('SELECT productiveUnits_supplies_state AS state, productiveUnits_supplies_quantityAvailable AS quantity FROM `productiveUnits_supplies` WHERE productiveUnits_supplies_id = ? AND productiveUnits_id = ?', [ supplyId, productiveUnitId ]); 
            validSupply = JSON.parse(JSON.stringify(validSupply));

            if (!validSupply.length > 0) throw `El insumo '${supplyId}' no existe o no le pertenece a la granja`;

            if (validSupply[0].state == 0) throw `El insumo '${supplyId}' se encuentra desactivado`;

            if (supplyQuantity > validSupply[0].quantity) throw `El insumo '${supplyId}' no cuenta con la cantidad suficiente (${supplyQuantity})`;

            element.push(validSupply[0].quantity);
        }

        // Se parsean los alevinos
        fingerlings = JSON.parse(fingerlings);

        let species = [];

        // Se verifica que los estanques sean válidos
        for (let index = 0; index < fingerlings.length; index++) {
            const element = fingerlings[index];
            
            let validFingerlings = await pool.query('SELECT productiveUnits_fingerlings_state AS state, specie_id AS specie FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ? AND productiveUnits_id = ?', [ element, productiveUnitId ]); 
            validFingerlings = JSON.parse(JSON.stringify(validFingerlings));

            if (!validFingerlings.length > 0) throw `Los alevinos '${element}' no existen o no le pertenecen a la granja`;

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
            productiveUnitId,
            initialState,
            weight,
            weightIterator: weight,
            quantityFish,
            quantityFishIterator: quantityFish,
            minimumSize,
            maximumSize,
            sowingDate,
            estimatedInitialHarvestDate,
            estimatedIFinalHarvestDate,
            harvestDate,
            serial,
            estimatedSalesPrice,
            description,
            fingerlings
        }

        // Se genera el token
        const token = generaterBatchToken(productiveUnitId, 4);

        // Se registra el lote
        let batch = await pool.query('INSERT INTO `batches`(`batches_token`, `batches_productiveUnit`, `batchesTypes_id`, `batches_body`, `batches_state`) VALUES (?, ?, ?, ?, ?)', [ token, productiveUnitId, 4, JSON.stringify(body), initialState ]);

        // Se registra el cambio de estado del último estanque asociado como "en uso"
        let lastPond = ponds[ponds.length - 1][0];
        await pool.query('UPDATE `productiveUnits_ponds` SET `productiveUnits_ponds_used`= 1 WHERE `productiveUnits_ponds_id` = ?', [ lastPond ]);

        // Se construye el query para estanques
        for (let index = 0; index < ponds.length; index++) {
            const element = ponds[index];

            queryPonds += `(${element[0]}, ${batch.insertId}, "${element[1]}"),`;
        }

        // Se elimina la última coma para evitar error en consuta
        if (queryPonds.endsWith(',')) {
            queryPonds = queryPonds.slice(0, -1);
        }
        
        // Se registran los estanques asociados
        await pool.query('INSERT INTO `batches_ponds`(`productiveUnits_ponds_id`, `batches_id`, `batches_ponds_useDate`) VALUES '+queryPonds);

        if (feed.length > 0) {
            // Se construye el query para piensos
            for (let index = 0; index < feed.length; index++) {
                const element = feed[index];

                queryFeeds += `(${batch.insertId}, ${element[0]}, "${element[1]}"),`;

                let newQuantity = element[2] - element[1];

                await pool.query('UPDATE `productiveUnits_feed` SET `productiveUnits_feed_quantityIterator` = ? WHERE `productiveUnits_feed_id` = ?', [ newQuantity, element[0] ]);
            }

            // Se elimina la última coma para evitar error en consuta
            if (queryFeeds.endsWith(',')) {
                queryFeeds = queryFeeds.slice(0, -1);
            }

            // Se registran los piensos asociados
            await pool.query('INSERT INTO `batches_feed`(`batches_id`, `productiveUnits_feed_id`, `batches_feed_quantity`) VALUES '+queryFeeds);
        }

        if (medicines.length > 0) {
            // Se construye el query para medicinas
            for (let index = 0; index < medicines.length; index++) {
                const element = medicines[index];

                queryMedicines += `(${batch.insertId}, ${element[0]}, "${element[1]}"),`;

                let newQuantity = element[2] - element[1];

                await pool.query('UPDATE `productiveUnits_medicine` SET `productiveUnits_medicine_quantityAvailable`= ? WHERE `productiveUnits_medicine_id` = ?', [ newQuantity, element[0] ]);
            }

            // Se elimina la última coma para evitar error en consuta
            if (queryMedicines.endsWith(',')) {
                queryMedicines = queryMedicines.slice(0, -1);
            }
            
            // Se registran los medicamentos asociados
            await pool.query('INSERT INTO `batches_medicines`(`batches_id`, `productiveUnits_medicine_id`, `batches_medicines_quantity`) VALUES '+queryMedicines);
        }

        if (supplies.length > 0) {
            // Se construye el query para medicinas
            for (let index = 0; index < supplies.length; index++) {
                const element = supplies[index];

                querySupplies += `(${batch.insertId}, ${element[0]}, "${element[1]}"),`;

                let newQuantity = element[2] - element[1];

                await pool.query('UPDATE `productiveUnits_supplies` SET `productiveUnits_supplies_quantityAvailable`= ? WHERE `productiveUnits_supplies_id` = ?', [ newQuantity, element[0] ]);
            }

            // Se elimina la última coma para evitar error en consuta
            if (querySupplies.endsWith(',')) {
                querySupplies = querySupplies.slice(0, -1);
            }
            
            // Se registran los medicamentos asociados
            await pool.query('INSERT INTO `batches_supplies`(`batches_id`, `productiveUnits_supplies_id`, `batches_supplies_quantity`) VALUES '+querySupplies);
        }

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
controller.getBatches = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), query("availableDispatch").optional().isBoolean(), query("state").optional().isInt(), handleValidationErrors, async(req, res) => {    
    try {
        // Se obtiene el ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // Se obtienen los filtros
        const availableDispatch = req.query.availableDispatch ?? null;
        const state = req.query.state ?? null;
        let filter = "";

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["lotes", "despachos"])) throw `Esta unidad productiva no pertenece a este usuario.`;
        
        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        if (availableDispatch != null) {
            filter += " AND batches_state = 4";
        }else if(state != null){
            filter += " AND batches_state = ?";
        }

        // Lotes que no han sido despachados
        let batches = await pool.query('SELECT batches_token AS token, batches_date AS date, batchesTypes_id AS type, batches_body AS body, batches_prevToken AS prevToken FROM `batches` WHERE batches_productiveUnit = ?'+filter+" ORDER BY batches_date DESC;", [ productiveUnitId, state ]);
        batches = JSON.parse(JSON.stringify(batches));
        
        for (const iterator of batches) {
            if (iterator.type == 1 || iterator.type == 4) {
                iterator.quantityFishIterator = JSON.parse(iterator.body)['quantityFishIterator'];
                iterator.weightIterator = JSON.parse(iterator.body)['weightIterator'];

                // Se obtienen los datos de los estanques asociados al lote
                let ponds = await pool.query('SELECT pp.productiveUnits_ponds_id AS id, pp.productiveUnits_ponds_name AS name FROM `batches_ponds` AS p LEFT JOIN batches AS b ON p.batches_id = b.batches_id LEFT JOIN productiveUnits_ponds AS pp ON pp.productiveUnits_ponds_id = p.productiveUnits_ponds_id WHERE b.batches_token = ?;', [ iterator.token ]);
                ponds = JSON.parse(JSON.stringify(ponds));

                // Se obtienen el estanque en uso
                let namePonds = ponds.at(-1)["name"] ?? 'No definido';
                iterator.pond = namePonds;

                let body = JSON.parse(iterator.body);

                if (iterator.type == 4) {
                    let fingerling = body.fingerlings;

                    let fingerlingData = await pool.query('SELECT specie_id AS specie FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ?', [ fingerling[0] ]);
                    fingerlingData = JSON.parse(JSON.stringify(fingerlingData));
                    
                    body.specie = fingerlingData[0].specie;
                }

                iterator.specie = await specieName(body.specie) ?? "";
                iterator.serial = body.serial;

                iterator.type = undefined;
                iterator.body = undefined;
                iterator.prevToken = undefined;
            }else if(iterator.type == 2 || iterator.type == 3 || iterator.type == 5 || iterator.type == 6){
                iterator.quantityFishIterator = JSON.parse(iterator.body)['quantityFishIterator'];
                iterator.weightIterator = JSON.parse(iterator.body)['weightIterator'];


                let prevTokenBatch = JSON.parse(iterator.prevToken);

                // Se obtienen los datos de los estanques asociados al lote
                let ponds = await pool.query('SELECT pp.productiveUnits_ponds_id AS id, pp.productiveUnits_ponds_name AS name FROM `batches_ponds` AS p LEFT JOIN batches AS b ON p.batches_id = b.batches_id LEFT JOIN productiveUnits_ponds AS pp ON pp.productiveUnits_ponds_id = p.productiveUnits_ponds_id WHERE b.batches_token = ?;', [ iterator.token ]);
                ponds = JSON.parse(JSON.stringify(ponds));

                // Se obtienen el estanque en uso
                let namePonds =  ponds.length > 0 ? ponds.at(-1)?.name ?? 'No definido' : 'No definido';
                iterator.pond = namePonds;

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
                        
                        iterator.specie = await specieName(body.specie) ?? "";
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

// Asociar estanque a lote
controller.associatePond = [verifyToken(config), body("pondId").notEmpty().isInt(), body("pondDate").notEmpty().isISO8601("yyyy-mm-dd").toDate(), param("id").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);

        // Se obtiene el ID del lote, el ID del estanque y la fecha de uso
        const pondId = req.body.pondId;
        const pondDate = req.body.pondDate;
        const batchesToken = req.params.id;

        // Se obtiene la información del lote
        let [pond] = await pool.query('SELECT productiveUnits_id AS productiveUnit, productiveUnits_ponds_used AS used, productiveUnits_ponds_name AS name FROM `productiveUnits_ponds` WHERE productiveUnits_ponds_id = ?;', [ pondId ]);

        if (!pond || pond.length === 0) throw ('Estanque no encontrado');

        if (pond.used == 1) throw `El lote ${pond.name} se encuentra en uso.`;

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(pond.productiveUnit, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        let [batchData] = await pool.query('SELECT batches_id AS id FROM `batches` WHERE batches_token = ? AND batches_productiveUnit = ?;', [ batchesToken, pond.productiveUnit ]);

        if (!batchData || batchData.length === 0) throw ('El lote no pertenece a la unidad productiva');

        // Se registra la relación lote-estanque
        await pool.query('INSERT INTO `batches_ponds`(`productiveUnits_ponds_id`, `batches_id`, `batches_ponds_useDate`) VALUES (?, ?, ?)', [ pondId, batchData.id, pondDate ]);

        // Se establece como libre al último estanque anterior
        let [lastPond] = await pool.query('SELECT productiveUnits_ponds_id AS pondId FROM `batches_ponds` WHERE batches_id = ? ORDER BY `batches_ponds_id` DESC;', [ batchData.id ]);

        await pool.query('UPDATE `productiveUnits_ponds` SET `productiveUnits_ponds_used`= 0 WHERE `productiveUnits_ponds_id` = ?', [ lastPond.pondId ]);

        // Se establece como en uso el nuevo estanque
        await pool.query('UPDATE `productiveUnits_ponds` SET `productiveUnits_ponds_used`= 1 WHERE `productiveUnits_ponds_id` = ?', [ pondId ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Asociar pienso a lote
controller.associateFeed = [verifyToken(config), body("feedId").notEmpty().isInt(), body("feedQuantity").notEmpty().isFloat(), param("id").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);

        // Se obtiene el ID del lote, el ID del estanque y la fecha de uso
        const feedId = req.body.feedId;
        const feedQuantity = req.body.feedQuantity;
        const batchesToken = req.params.id;

        // Se obtiene la información del lote
        let [feed] = await pool.query('SELECT productiveUnits_id AS productiveUnit, productiveUnits_feed_quantityIterator AS quantityAvailable, productiveUnits_feed_name AS name FROM `productiveUnits_feed` WHERE productiveUnits_feed_id = ?;', [ feedId ]);

        if (!feed || feed.length === 0) throw ('Pienso no encontrado');

        if (feed.quantityAvailable < feedQuantity) throw `El pienso ${feed.name} no cuenta con la cantidad requerida.`;

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(feed.productiveUnit, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        let [batchData] = await pool.query('SELECT batches_id AS id FROM `batches` WHERE batches_token = ? AND batches_productiveUnit = ?;', [ batchesToken, feed.productiveUnit ]);

        if (!batchData || batchData.length === 0) throw ('El lote no pertenece a la unidad productiva');

        // Se registra la relación lote-pienso
        await pool.query('INSERT INTO `batches_feed`(`batches_id`, `productiveUnits_feed_id`, `batches_feed_quantity`) VALUES (?, ?, ?)', [ batchData.id, feedId, feedQuantity ]);

        // Se disminuye la cantidad disponible del pienso
        let newQuantity = feed.quantityAvailable - feedQuantity;

        await pool.query('UPDATE `productiveUnits_feed` SET `productiveUnits_feed_quantityIterator` = ? WHERE `productiveUnits_feed_id` = ?', [ newQuantity, feedId ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Asociar medicina a lote
controller.associateMedicine = [verifyToken(config), body("medicineId").notEmpty().isInt(), body("medicineQuantity").notEmpty().isFloat(), param("id").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);

        // Se obtiene el ID del lote, el ID del estanque y la fecha de uso
        const medicineId = req.body.medicineId;
        const medicineQuantity = req.body.medicineQuantity;
        const batchesToken = req.params.id;

        // Se obtiene la información del lote
        let [medicine] = await pool.query('SELECT productiveUnits_id AS productiveUnit, productiveUnits_medicine_quantityAvailable AS quantityAvailable, productiveUnits_medicine_name AS name FROM `productiveUnits_medicine` WHERE productiveUnits_medicine_id = ?;', [ medicineId ]);

        if (!medicine || medicine.length === 0) throw ('Medicamento no encontrado');

        if (medicine.quantityAvailable < medicineQuantity) throw `El medicamento ${medicine.name} no cuenta con la cantidad requerida.`;

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(medicine.productiveUnit, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        let [batchData] = await pool.query('SELECT batches_id AS id FROM `batches` WHERE batches_token = ? AND batches_productiveUnit = ?;', [ batchesToken, medicine.productiveUnit ]);

        if (!batchData || batchData.length === 0) throw ('El lote no pertenece a la unidad productiva');

        // Se registra la relación lote-pienso
        await pool.query('INSERT INTO `batches_medicines`(`batches_id`, `productiveUnits_medicine_id`, `batches_medicines_quantity`) VALUES (?, ?, ?)', [ batchData.id, medicineId, medicineQuantity ]);

        // Se disminuye la cantidad disponible del pienso
        let newQuantity = medicine.quantityAvailable - medicineQuantity;

        await pool.query('UPDATE `productiveUnits_medicine` SET `productiveUnits_medicine_quantityAvailable`= ? WHERE `productiveUnits_medicine_id` = ?', [ newQuantity, medicineId ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Asociar insumo a lote
controller.associateSupply = [verifyToken(config), body("supplyId").notEmpty().isInt(), body("supplyQuantity").notEmpty().isFloat(), param("id").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);

        // Se obtiene el ID del lote, el ID del estanque y la fecha de uso
        const supplyId = req.body.supplyId;
        const supplyQuantity = req.body.supplyQuantity;
        const batchesToken = req.params.id;

        // Se obtiene la información del lote
        let [supply] = await pool.query('SELECT productiveUnits_id AS productiveUnit, productiveUnits_supplies_quantityAvailable AS quantityAvailable, productiveUnits_supplies_name AS name FROM `productiveUnits_supplies` WHERE productiveUnits_supplies_id = ?;', [ supplyId ]);

        if (!supply || supply.length === 0) throw ('Insumo no encontrado');

        if (supply.quantityAvailable < supplyQuantity) throw `El insumo ${supply.name} no cuenta con la cantidad requerida.`;

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(supply.productiveUnit, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        let [batchData] = await pool.query('SELECT batches_id AS id FROM `batches` WHERE batches_token = ? AND batches_productiveUnit = ?;', [ batchesToken, supply.productiveUnit ]);

        if (!batchData || batchData.length === 0) throw ('El lote no pertenece a la unidad productiva');

        // Se registra la relación lote-insumo
        await pool.query('INSERT INTO `batches_supplies`(`batches_id`, `productiveUnits_supplies_id`, `batches_supplies_quantity`) VALUES (?, ?, ?)', [ batchData.id, supplyId, supplyQuantity ]);

        // Se disminuye la cantidad disponible del pienso
        let newQuantity = supply.quantityAvailable - supplyQuantity;

        await pool.query('UPDATE `productiveUnits_supplies` SET `productiveUnits_supplies_quantityAvailable`= ? WHERE `productiveUnits_supplies_id` = ?', [ newQuantity, supplyId ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Registrar mortalidad
controller.addMortality = [verifyToken(config), body("date").notEmpty().isISO8601("yyyy-mm-dd").toDate(), body("quantity").notEmpty().isInt(), body("note").optional(), param("id").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);

        const date = req.body.date;
        const quantity = req.body.quantity;
        const note = req.body.note ?? null;
        const batchesToken = req.params.id;
        
        let [batchData] = await pool.query('SELECT batches_id AS id, batches_productiveUnit AS productiveUnit, JSON_UNQUOTE(JSON_EXTRACT(batches_body, "$.quantityFishIterator")) AS quantityFishIterator FROM `batches` WHERE batches_token = ?;', [ batchesToken ]);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(batchData.productiveUnit, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        await pool.query('INSERT INTO `batches_mortality`(`batches_id`, `batches_mortality_dataDate`, `batches_mortality_quantity`, `batches_mortality_note`) VALUES (?, ?, ?, ?)', [ batchData.id, date, quantity, note ]);

        // Se calcula el nuevo valor de quantityFishIterator, asegurando que no sea menor de 0
        const newQuantityFishIterator = Math.max(0, batchData.quantityFishIterator - quantity);

        await pool.query('UPDATE batches SET batches_body = JSON_SET(batches_body, "$.quantityFishIterator", ?) WHERE batches_token = ?', [ newQuantityFishIterator, batchesToken ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Registrar de biomasa
controller.addBiomass = [verifyToken(config), body("samples").notEmpty(), param("id").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);

        let samples = req.body.samples ?? [];
        const batchesToken = req.params.id;
        let images = req.files ?? [];

        samples = JSON.parse(samples);
        let biomass = 0;

        let minSize = 0;
        let maxSize = 0;
        let minWeight = 0;
        let maxWeight = 0;

        let [batchData] = await pool.query('SELECT batches_id AS id, b.batchesTypes_id AS type, p.productiveUnits_types_id AS PUnitType, JSON_UNQUOTE(JSON_EXTRACT(batches_body, "$.quantityFishIterator")) AS quantityFishIterator, batches_body AS body FROM `batches` AS b LEFT JOIN productiveUnits AS p ON p.productiveUnits_id = b.batches_productiveUnit WHERE batches_token = ?;', [ batchesToken ]);

        //let body = JSON.parse(batchData.body);

        if (batchData.quantityFishIterator < 1) throw "El lote no tiene individuos"; 

        if(batchData.PUnitType == 1){
            // Validar que haya al menos 10 muestras
            if (samples.length < 1) {
                throw "Para completar el registro de biomasa se necesita por lo menos una muestra";
            }

            biomass = (samples[0].weight/samples[0].quantity) * batchData.quantityFishIterator;
        }else{
            if (batchData.quantityFishIterator < 10) throw "El lote tiene menos de 10 individuos. No tiene sentido que registres la biomasa. Usalos para consumo personal."; 

            // Validar que haya al menos 1 muestra
            if (samples.length < 10) {
                throw "Para completar el registro de biomasa se necesitan por lo menos diez(10) muestras";
            }
            
            minSize = samples[0].size;
            maxSize = samples[0].size;
            minWeight = samples[0].weight;
            maxWeight = samples[0].weight;

            totalWeight = 0;

            for (let index = 0; index < samples.length; index++) {
                let element = samples[index];

                if (element.size > maxSize) {
                    maxSize = parseFloat(element.size);
                }

                if (element.size < minSize) {
                    minSize = parseFloat(element.size);
                }

                if (element.weight > maxWeight) {
                    maxWeight = parseFloat(element.weight);
                }

                if (element.weight < minWeight) {
                    minWeight = parseFloat(element.weight);
                }
                
                if (batchData.type == 1 && element.size == 0) {  
                    throw "Es obligatorio que las muestras tengan el tamaño.";
                }
                
                if (batchData.type == 4 && element.weight == 0) {
                    throw "Es obligatorio que las muestras tengan el peso.";
                }

                totalWeight += parseFloat(element.weight);
            }

            biomass = batchData.quantityFishIterator * (totalWeight/samples.length);
        }

        // Validar el número de imágenes subidas (1 a 4 fotos)
        const imageKeys = Object.keys(images);
        if (imageKeys.length < 1 || imageKeys.length > 4) {
            throw "Para completar el registro de biomasa se necesitan evidencias fotográficas. Mínimo una(1) foto y máximo cuatro(4) fotos.";
        }
        

        // Array para guardar url de las imagenes 
        let imagesUrl = [];

        // Ruta dónde guardar el archivo
        let folder = "./src/public/content/batches/biomassImages/";

        // Procesar y guardar cada imagen subida
        for (let key of imageKeys) {
            let file = images[key];
            let fileName = genRandomString(12) + ".jpeg";

            await sharp(file.data)
                .jpeg({ quality: 100 })
                .toFile(folder + fileName);

            imagesUrl.push(fileName);
        } 

        await pool.query('INSERT INTO `batches_biomass`(`batches_id`, `batches_biomass_samples`, `batches_biomass_images`, batches_biomass_minSize, batches_biomass_maxSize, batches_biomass_minWeight, batches_biomass_maxWeight, batches_biomass_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [ batchData.id, JSON.stringify(samples), JSON.stringify(imagesUrl), minSize, maxSize, minWeight, maxWeight, biomass ]);

        if (batchData.type == 1 || batchData.type == 2 || batchData.type == 3) {  
            await pool.query('UPDATE batches SET batches_body = JSON_SET(batches_body, "$.biomass", ?) WHERE batches_token = ?', [ biomass, batchesToken ]);
        }
        
        if (batchData.type == 4 || batchData.type == 5 || batchData.type == 6) {  
            await pool.query('UPDATE batches SET batches_body = JSON_SET(batches_body, "$.biomass", ?, "$.minimumSize", ?, "$.maximumSize", ?)  WHERE batches_token = ?', [ biomass, minSize, maxSize, batchesToken ]);
        }

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
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

// Asociar ingreso a lote
controller.associateIncomes = [verifyToken(config), body("batch").notEmpty(), body("income").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.body.productiveUnit;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["skip"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Datos POST
        let income = req.body.income;
        let batch = req.body.batch

        let incomeInfo = await pool.query('SELECT productiveUnits_id AS productiveUnit FROM `productiveUnits_incomes` WHERE productiveUnits_incomes_id = ?;', [ income ]);
        incomeInfo = JSON.parse(JSON.stringify(incomeInfo));

        if(!incomeInfo.length > 0) throw "El ingreso no existe";

        let batchInfo = await pool.query('SELECT batches_productiveUnit AS productiveUnit, batches_id AS id FROM `batches` WHERE batches_token = ?;', [ batch ]);
        batchInfo = JSON.parse(JSON.stringify(batchInfo));

        if(!batchInfo.length > 0) throw "El lote no existe";

        if (incomeInfo[0].productiveUnits_id == incomeInfo[0].productiveUnits_id) {
            await pool.query('UPDATE `productiveUnits_incomes` SET `batches_id`= ? WHERE `productiveUnits_incomes_id` = ?', [ batchInfo[0].id, income ]);

            res.status(200).json({});
        }else{
            throw "El lote no pertenece a la unidad productiva del ingreso"
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Asociar ingreso a lote
controller.incomes = [verifyToken(config), query("productiveUnit").notEmpty().isInt(), query("batch").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnit;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["skip"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Datos POST
        let batch = req.query.batch;

        let batchInfo = await pool.query('SELECT batches_id AS id FROM `batches` WHERE batches_token = ?', [ batch ]);
        batchInfo = JSON.parse(JSON.stringify(batchInfo));

        let incomes = await pool.query('SELECT productiveUnits_incomes_id AS id, productiveUnits_incomes_name AS name, productiveUnits_incomes_value AS value, productiveUnits_incomes_description AS description, productiveUnits_incomes_date AS date FROM `productiveUnits_incomes` WHERE batches_id = ?', [ batchInfo[0].id ]);
        incomes = JSON.parse(JSON.stringify(incomes));

        res.status(200).json({incomes});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

module.exports = controller;