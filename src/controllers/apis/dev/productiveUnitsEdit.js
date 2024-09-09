// Configuración de las API's
const config = require("./configApis");

// Librerias
const pool = require("../../../config/dbConnections"+config.DBName);
const fetch = require('node-fetch');
const verifyToken = require("./../../../helpers/auth");
const { genRandomNumberCode, genRandomString } = require('../../../helpers/randomString');
const { handleValidationErrors } = require('../../../helpers/hasErrorsResults');
const { body, query } = require('express-validator');
const sharp = require('sharp');
const fs = require('fs');
const {sendMail} = require("../../../helpers/emails/index");
const { validProductiveUnitType, getUserId, userOwnerProductiveUnit, productiveUnitActive, getUserHash, getUserAuth } = require('./common/productiveUnitsEdit.js');


// Controlador
const controller = {};


// // // // // // // // // // // // // // // // ///
// INICIO DE CONTROLADORES PERFIL DE ALEVINEROS //
// // // // // // // // // // // // // // // ////

// Crear y editar información de Alevinera
controller.informacionAlevinera = [verifyToken(config), body("name").notEmpty().isString(), body("email").optional().notEmpty().isEmail(), body("phone").notEmpty().isMobilePhone(), body("webPage").optional().notEmpty().isURL(), body("municipality").notEmpty().isInt(), body("address").notEmpty().isString(), body("coords").notEmpty().isLatLong(), body("ponds").optional().notEmpty().toArray().isArray(), body("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.body.productiveUnitId;

        // Se verifica si la unidad productiva es válida
        // SE AGREGO TEMPORALMENTE LA DOBLE VERIFICACIÓN A ALEVINERA Y ENGORDE - Debe estar solo la primera (Alevinera)
        if (!await validProductiveUnitType(productiveUnitId, 1) && !await validProductiveUnitType(productiveUnitId, 2)) throw 'Esta unidad productiva no es una alevinera';

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Estanques de la granja
        let ponds = req.body.ponds ?? "{}";
        ponds = JSON.parse(ponds);

        // Se verifica si vienen estanques
        if (ponds.length > 0) {
            // Se contruye la query dinámica y se verifican que no estén repetidos
            let valuesPonds = [];
            
            pondsQuery = "";
            for (const iterator of ponds) {
                const name = iterator[0];
                const location = iterator[1];
                if (!valuesPonds.includes(name)) {
                    pondsQuery+= `(${productiveUnitId}, "${name}", "${location}"),`;
                    valuesPonds.push(name);
                }
            }

            pondsQuery = pondsQuery.slice(0, -1);
        
            await pool.query('INSERT INTO `productiveUnits_ponds`(`productiveUnits_id`, `productiveUnits_ponds_name`, `productiveUnits_ponds_location`) VALUES '+pondsQuery);
        }

        // Objeto con valores
        let data = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            webPage: req.body.webPage ?? '',
            municipality: req.body.municipality,
            address: req.body.address,
            coords: req.body.coords,
            logo: ""
        }

        // Se verifica si viene una imagen
        if (req.files && req.files.logo) {
            // Ruta dónde guardar la imagen
            let folder = "./src/public/content/productiveUnits/";

            // Se obtiene la imagen
            let logoFile = req.files.logo;

            // Se genera nombre aleatorio
            let imageName = genRandomString(12)+".jpeg";

            // Se guarda la imagen
            await sharp(logoFile.data).jpeg({ mozjpeg: true }).toFile(folder+imageName);
            
            data.logo = imageName;
        }else{
            let hasAlredyLogo = await pool.query('SELECT JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(productiveUnits_body, "$.profile.informacionAlevinera")), "$.logo")) AS logo FROM `productiveUnits` WHERE productiveUnits_id = ?;', [productiveUnitId]);
            hasAlredyLogo = JSON.parse(JSON.stringify(hasAlredyLogo));

            if (hasAlredyLogo.length > 0) {
                data.logo = hasAlredyLogo[0].logo;
            }
        }

        // Se parsea y se actualiza el perfil de la unidad productiva
        const result =  await pool.query(`UPDATE productiveUnits SET productiveUnits_body = JSON_SET(productiveUnits_body, "$.profile.informacionAlevinera", ?) WHERE productiveUnits_id = ? AND users_id = ?`, [JSON.stringify(data), productiveUnitId, userId]);

        // Se verifica si se editó correctamente el perfil
        if (result.affectedRows > 0) {
            res.status(200).json({});
        } else {
            throw "Error al actualizar datos";
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error: error});
    }
}]

// Obtener datos de información Alevinera
controller.getInformacionAlevinera = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["skip"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se consulta y se parsea la información de la alevinera
        let data = await pool.query('SELECT JSON_UNQUOTE(JSON_EXTRACT(productiveUnits_body, "$.profile.informacionAlevinera")) AS body FROM `productiveUnits` WHERE productiveUnits_id = ?', [productiveUnitId]);
        data = data[0].body;
        data = JSON.parse(data);

        if (data == null || data == undefined || data.length < 0) throw "204";

        // Se elimina el atributo de logo
        delete data.logo;

        // Variable para guardar datos del municipio
        let dataCity;

        // Se consulta el departamento según el id del municipio
        await fetch(config.apisRoute+"/general/cities?id="+data.municipality, {method: 'GET'})
        .then(async response =>  {
            if (response.status === 200) {
                dataCity = await response.json();
            }else{
                res.status(response.status).json(await response.json());
            }
        })
        .catch(err => {
            console.log(err);
            throw "Error en consulta de departamento";
        });

        data.region = dataCity.cities[0].regions_id;

        // Se obtienen y se registan los estanques
        let pondsData = await pool.query('SELECT productiveUnits_ponds_id AS id, productiveUnits_ponds_name AS name, productiveUnits_ponds_location AS location, productiveUnits_ponds_area AS area, productiveUnits_ponds_volume AS volume, productiveUnits_ponds_additionalInfo AS additionalInfo FROM `productiveUnits_ponds` WHERE productiveUnits_id = ? AND productiveUnits_ponds_state = 1', [productiveUnitId]);
        pondsData = JSON.parse(JSON.stringify(pondsData));

        data.ponds = pondsData;

        res.status(200).json({data});
    } catch (error) {
        console.log(error);
        if (error == "204") {
            res.status(204).json({});
        } else {
            res.status(400).json({error});
        }
    }
}]

/*
---------------------------
| Información de padrotes |
---------------------------
*/

// Obtener padrotes  
controller.informacionPadrotesAlevinera = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Obtener padrotes activos
        let broodstocksActive = await pool.query(`SELECT productiveUnits_broodstock_id AS id, DATE_FORMAT(STR_TO_DATE(REPLACE(JSON_EXTRACT(productiveUnits_broodstock_body, "$.receptionDate"), '"', ''), '%Y-%m-%dT%H:%i:%s'), '%Y-%m-%d %H:%i:%s') AS receptionDateTime, specie_id AS specie FROM productiveUnits_broodstock WHERE productiveUnits_id = ? AND productiveUnits_broodstock_state = 1; `, [productiveUnitId]);
        broodstocksActive = JSON.parse(JSON.stringify(broodstocksActive));

        // Obtener padrotes inactivos   
        let broodstocksInactive = await pool.query(`SELECT productiveUnits_broodstock_id AS id, DATE_FORMAT(STR_TO_DATE(REPLACE(JSON_EXTRACT(productiveUnits_broodstock_body, "$.receptionDate"), '"', ''), '%Y-%m-%dT%H:%i:%s'), '%Y-%m-%d %H:%i:%s') AS receptionDateTime, specie_id AS specie FROM productiveUnits_broodstock WHERE productiveUnits_id = ? AND productiveUnits_broodstock_state = 0;`, [productiveUnitId]);
        broodstocksInactive = JSON.parse(JSON.stringify(broodstocksInactive));

        // Se obtien las especies para igualar los ID a los nombres de las especies
        let species = await fetch(`${config.apisRouteRedAzul}/general/species?flag=*`, {
                method: "GET"
            }).then(async response =>  {
            if (response.status === 200) {
                speciesJson = await response.json();
                speciesJson = speciesJson.speciesTypes;
                speciesParsed = {};

                for (let index = 0; index < speciesJson.length; index++) {
                    const element = speciesJson[index];
                    
                    speciesParsed[element.id] = element.vulgarName;
                }

                return speciesParsed;
            }else{
                res.status(response.status).json(await response.json());
            }
        });

        // Se hace la traducción de ID a nombre en caso de que hayan registros de padrotes
        if (broodstocksActive.length > 0) {
            for (let index = 0; index < broodstocksActive.length; index++) {
                const element = broodstocksActive[index];
                element.specie = species[element.specie] ?? null;
            }
        }

        if (broodstocksInactive.length > 0) {
            for (let index = 0; index < broodstocksInactive.length; index++) {
                const element = broodstocksInactive[index];
                element.specie = species[element.specie] ?? null;
            }
        }

        broodstocks = {
            "active": broodstocksActive,
            "inactive": broodstocksInactive
        }

        res.status(200).json({broodstocks});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

// Obtener información de un padrote especifico
controller.specificBroodstock = [verifyToken(config), query("broodstockId").notEmpty().isInt(), async(req, res) => {
    // ID del usuario
    const userId = await getUserId(req);
    
    // ID del padrote
    const broodstockId = req.query.broodstockId;

    // Se verifica si el padrote pertenece a una granja que pertenezca al usuario
    let broodstock = await pool.query('SELECT productiveUnits_id AS productiveUnitId, productiveUnits_broodstock_body AS body, specie_id as specie, productiveUnits_broodstock_state AS state FROM `productiveUnits_broodstock`WHERE productiveUnits_broodstock_id = ?', [ broodstockId ]);
    broodstock = JSON.parse(JSON.stringify(broodstock));

    if (broodstock.length < 1) throw "El padrote no está registrado";

    // Datos del padrote
    let broodstockData = JSON.parse(broodstock[0].body);

    // Id de la unidad productiva
    const productiveUnitId = broodstock[0].productiveUnitId;

    // se verifica que la unidad productiva pertenezca al usuario
    if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

    // se verifica que la unidad productiva se encuentre activa
    if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

    // Se obtien las datos de la especie
    let specie = await fetch(`${config.apisRouteRedAzul}/general/species?flag=`+broodstock[0].specie, {method: "GET"})
    .then(async response =>  {
        if (response.status === 200) {
            speciesJson = await response.json();
            return speciesJson;
        }else{
            throw "Error al consulta especies";
        }
    });

    broodstockData.specie = specie.speciesTypes[0].vulgarName;

    // Se convierte el id del origen del pescado a nombre
    let origin = await pool.query('SELECT fishesOrigin_name AS name FROM `fishesOrigin` WHERE fishesOrigin_id = ?', [ broodstockData.origin ]);
    origin = JSON.parse(JSON.stringify(origin));

    broodstockData.origin = origin[0].name;

    // Se convierte el id del tipo de código a nombre
    let referenceCodeType = await pool.query('SELECT referenceCodes_name AS name FROM `referenceCodes` WHERE referenceCodes_id = ?', [ broodstockData.referenceCodeType ]);
    referenceCodeType = JSON.parse(JSON.stringify(referenceCodeType));

    broodstockData.referenceCodeType = referenceCodeType[0].name;

    // Se agrega el estado del padrote
    broodstockData.state = broodstock[0].state;

    res.status(200).json({broodstockData});
}]

// Registrar padrotes de alevinera
controller.createPadrotesAlevinera = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("specieType").notEmpty().isInt(), body("specie").notEmpty().isInt(), body("origin").notEmpty().isInt(), body("receptionDate").notEmpty().isISO8601("yyyy-mm-dd").toDate(), body("referenceCodeType").notEmpty().isInt(), body("referenceCode").notEmpty(), handleValidationErrors, async(req, res) => { 
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.body.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Datos de los padrotes
        const specie = req.body.specie;
        const origin = req.body.origin;
        const receptionDate  = req.body.receptionDate;
        let vendorName = req.body.vendorName ?? "";
        let vendorID = req.body.vendorID ?? "";
        let vendorDV = req.body.vendorDV ?? "";
        const referenceCodeType = req.body.referenceCodeType;
        const referenceCode  = req.body.referenceCode;
        const authorizationGeneticMaterial = req.body.authorizationGeneticMaterial ?? false;
        const countryGeneticMaterial = req.body.countryGeneticMaterial ?? null;
        const watershedGeneticMaterial = req.body.countryGeneticMaterial ?? null;

        // Se verifica si el código de referencia es válido
        let codeType = await pool.query('SELECT referenceCodes_name  AS name, referenceCodes_rule AS rule FROM `referenceCodes` WHERE referenceCodes_id = ?', [ referenceCodeType ]);
        codeType = JSON.parse(JSON.stringify(codeType));

        // Reglas del tipo de codigo
        codeRule = JSON.parse(codeType[0].rule);

        if (codeType.length < 1) throw "Tipo de codigo de referencia inválido";
        if (referenceCode.length < codeRule.min || referenceCode.length > codeRule.max) throw `El código ${referenceCode} no es un ${codeType[0].name} válido, min: ${codeRule.min} y max: ${codeRule.max}`;

        // Se verifica si el origen es válido
        let originId = await pool.query('SELECT * FROM `fishesOrigin` WHERE fishesOrigin_id = ?', [ origin ]);

        if (originId.length < 1) throw "Tipo de origen inválido";

        // Se verifica si el documento de autorizacion de alevinos fue mandado, en caso tal se guarda
        let broodstockAuthorization;

        if (req.files && req.files.broodstockAuthorization){
            // Ruta dónde guardar el archivo
            let folder = "./src/public/content/productiveUnits/authorizations/";

            // Se obtiene el archivo
            let broodstockAuthorizationFile = req.files.broodstockAuthorization;

            // Se valida que el archivo sea PDF
            if (broodstockAuthorizationFile.mimetype != 'application/pdf') throw "La autorización solo puede ser un PDF";

            // Se genera nombre aleatorio
            let fileName = genRandomString(12)+".pdf";

            // Se guarda el archivo
            broodstockAuthorizationFile.mv(folder+fileName);

            broodstockAuthorization = fileName;
        }else{
            broodstockAuthorization = "";
        }

        // Se verifica si es la primera vez que se registra un padrote
        let prevBroodstock = await pool.query('SELECT productiveUnits_broodstock_id AS id FROM `productiveUnits_broodstock` WHERE productiveUnits_id = ?', [ productiveUnitId ]);
        prevBroodstock = JSON.parse(JSON.stringify(prevBroodstock));

        if (prevBroodstock.length < 1) {
            await pool.query('UPDATE `productiveUnits` SET `productiveUnits_body` = JSON_SET(`productiveUnits_body`, "$.profile.informacionPadrotes", true) WHERE `productiveUnits_id` = ?', [ productiveUnitId ]);
        }

        // Se registra el padrote dependediendo del origen
        if (origin == 1) {
            const broodstockBody = {
                origin,
                vendorName,
                vendorID,
                vendorDV,
                referenceCodeType,
                referenceCode,
                broodstockAuthorization,
                receptionDate,
                authorizationGeneticMaterial,
                countryGeneticMaterial,
                watershedGeneticMaterial
            };

            await pool.query('INSERT INTO `productiveUnits_broodstock`(`productiveUnits_id`, `specie_id`, `productiveUnits_broodstock_body`) VALUES (?, ?, ?)', [ productiveUnitId, specie, JSON.stringify(broodstockBody) ]);
        
            res.status(200).json({});
        }else if(origin == 2){
            // Se obtiene el hash de redAzul y la key para hacer consulta
            const userHash = await getUserHash(userId);
            const authorizationKey = "pub_2faf2c9769ca1c5e7db0557a5de5108e2593f05b759a566068cf4667cee63f45";

            fetch(`${config.apisRouteRedAzul}/users/data?userHash=${userHash}`, {
                method: 'GET',
                headers: { "Authorization": authorizationKey }
            })
            .then(async response =>  {
                if (response.status === 200) {

                    data = await response.json();
                    data = data.userData;
                    
                    const broodstockBody = {
                        origin,
                        vendorName: data.name,
                        vendorID: data.documentNumber,
                        vendorDV: data.dv,
                        referenceCodeType,
                        referenceCode,
                        broodstockAuthorization,
                        receptionDate,
                        authorizationGeneticMaterial,
                        countryGeneticMaterial,
                        watershedGeneticMaterial
                    };
        
                    await pool.query('INSERT INTO `productiveUnits_broodstock`(`productiveUnits_id`, `specie_id`, `productiveUnits_broodstock_body`) VALUES (?, ?, ?)', [ productiveUnitId, specie, JSON.stringify(broodstockBody) ]);
                
                    res.status(200).json({});
                }else{
                    let data = await response.json();
                    res.status(response.status).json({error: data});
                }
            })
            .catch(err => {
                console.log(err);
                res.status(500).json({error: err});
            });   
        }else{
            const broodstockBody = {
                origin,
                referenceCodeType,
                referenceCode,
                receptionDate
            };

            await pool.query('INSERT INTO `productiveUnits_broodstock`(`productiveUnits_id`, `specie_id`, `productiveUnits_broodstock_body`) VALUES (?, ?, ?)', [ productiveUnitId, specie, JSON.stringify(broodstockBody) ]);
        
            res.status(200).json({});
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

controller.editPadrotesAlevinera = [verifyToken(config), body("broodstockId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    //ID del padrote de la alevinera
    const broodstockId = req.body.broodstockId;

    // ID del usuario
    const userId = await getUserId(req);

    // Se verifica si el padrote pertenece a una granja que pertenezca al usuario
    let broodstock = await pool.query('SELECT productiveUnits_id AS productiveUnitId FROM `productiveUnits_broodstock`WHERE productiveUnits_broodstock_id = ?', [ broodstockId ]);
    broodstock = JSON.parse(JSON.stringify(broodstock));

    if (broodstock.length < 1) throw "El padrote no está registrado";

    // Id de la unidad productiva
    const productiveUnitId = broodstock[0].productiveUnitId;

    // se verifica que la unidad productiva pertenezca al usuario
    if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

    // se verifica que la unidad productiva se encuentre activa
    if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

    await pool.query('UPDATE `productiveUnits_broodstock` SET `productiveUnits_broodstock_state` = 0 WHERE `productiveUnits_broodstock_id` = ?', [ broodstockId ]);

    res.status(200).json({});
}]


/*
-------------------------------
- Información de bioseguridad -
-------------------------------
*/

// Información de bioseguridad
controller.getInformacionBioseguridadAlevinera = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos", "modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        let biosecurity = await pool.query('SELECT breedingBiosecurity_documentId AS docId, DATE_FORMAT(breedingBiosecurity_documentDate, "%Y-%m-%d") AS docDate, breedingBiosecurity_documentUrl AS docUrl FROM `breedingBiosecurity` WHERE productiveUnit_id = ? ORDER BY `breedingBiosecurity_id` DESC LIMIT 1', [ productiveUnitId ]);
        biosecurity = JSON.parse(JSON.stringify(biosecurity));

        biosecurity = biosecurity[0];

        res.status(200).json({biosecurity});

    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

//
// Información de bioseguridad
controller.editInformacionBioseguridadAlevinera = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("documentNumber").notEmpty(), body("documentDate").notEmpty().isISO8601("yyyy-mm-dd").toDate(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.body.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se verifica si ya tiene un certificado registrado para completar el perfil
        let hasBreedingBiosecurity = await pool.query('SELECT * FROM `breedingBiosecurity` WHERE productiveUnit_id = ?', [ productiveUnitId ]);
        hasBreedingBiosecurity = JSON.parse(JSON.stringify(hasBreedingBiosecurity));

        if (hasBreedingBiosecurity.length < 1){
            await pool.query('UPDATE `productiveUnits` SET `productiveUnits_body` = JSON_SET(`productiveUnits_body`, "$.profile.informacionBioseguridadAlevinera", true) WHERE `productiveUnits_id` = ?', [ productiveUnitId ]);
        }

        // Datos POST
        const documentNumber = req.body.documentNumber;
        const documentDate = req.body.documentDate;
        let documentCertificateUrl = "";

        if (req.files && req.files.documentCertificate) {
            // Ruta dónde guardar el archivo
            let folder = "./src/public/content/productiveUnits/certificates/";

            // Se obtiene el archivo
            let documentCertificate = req.files.documentCertificate;

            // Se valida que el archivo sea PDF
            if (documentCertificate.mimetype != 'application/pdf') throw "La certificación solo puede ser un PDF";

            // Se genera nombre aleatorio
            let fileName = genRandomString(12)+".pdf";

            // Se guarda el archivo
            documentCertificate.mv(folder+fileName);

            documentCertificateUrl = fileName;

            await pool.query('INSERT INTO `breedingBiosecurity`(`productiveUnit_id`, `breedingBiosecurity_documentId`, `breedingBiosecurity_documentDate`, `breedingBiosecurity_documentUrl`) VALUES (?, ?, ?, ?)', [ productiveUnitId, documentNumber, documentDate, documentCertificateUrl ]);

            res.status(200).json({});
        } else {
            throw "El certificado es obligatorio";
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

// Registrar información de bioseguridad después
controller.biosecurityLinkAfter = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.body.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        await pool.query('UPDATE `productiveUnits` SET `productiveUnits_body` = JSON_SET(`productiveUnits_body`, "$.profile.informacionBioseguridadAlevinera", true) WHERE `productiveUnits_id` = ?', [ productiveUnitId ]);
        
        res.status(200).json({});
    } catch (error) {
        console.log(error);
            res.status(400).json({error});
    }
}];


/*
----------------------
- Lotes de alevinera -
----------------------
*/

// Obtener especies que tiene agregada la alevinera
controller.loteAlevineraSpecies = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        let species = await pool.query('SELECT specie_id AS id FROM `productiveUnits_broodstock` WHERE productiveUnits_id = ? GROUP BY specie_id;', [ productiveUnitId ]);
        species = JSON.parse(JSON.stringify(species));

        for (let index = 0; index < species.length; index++) {
            const element = species[index];
            
            let specieData = await fetch(`${config.apisRouteRedAzul}/general/specificSpecie?id=${element.id}`, {
                method: 'GET',
                headers: { "Authorization": config.trazulKey }
            })
            .then(async response =>  {
                if (response.status === 200) {
                    return await response.json();
                }else{
                    throw await response.json();;
                }
            })

            element.name = specieData.specie.vulgarName;
        }

        res.status(200).json({species});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener especies que tiene agregada la alevinera
controller.loteAlevineraPadrotes = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), query("specie").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // Id de la specie
        let specie = req.query.specie;

        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        let padrotes = await pool.query('SELECT productiveUnits_broodstock_id AS id, productiveUnits_broodstock_body AS body FROM `productiveUnits_broodstock` WHERE specie_id = ? AND productiveUnits_broodstock_state = 1 AND productiveUnits_id = ?', [ specie, productiveUnitId ]);
        padrotes = JSON.parse(JSON.stringify(padrotes));

        for (let index = 0; index < padrotes.length; index++) {
            const element = padrotes[index];

            element.body = JSON.parse(element.body);
            
        }

        res.status(200).json({padrotes});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];


// // // // // // // // // // // // // // // ///
// FIN DE CONTROLADORES PERFIL DE ALEVINEROS //
// // // // // // // // // // // // // // ////


// CONTROLADORES DE ESTANQUES/
// Agregar estanques
controller.addPonds = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("pondName").notEmpty().isString(), body("pondLocation").optional().isString(), body("pondArea").notEmpty().isFloat(), body("pondVolume").notEmpty().isFloat(), body("pondAdditionalInfo").optional().isString(), handleValidationErrors, async(req, res) => {
    try {   
        // DATOS POST
        const productiveUnitId = req.body.productiveUnitId;
        const pondName = req.body.pondName;
        const pondLocation = req.body.pondLocation ?? null;
        const pondArea = req.body.pondArea;
        const pondVolume = req.body.pondVolume;
        const pondAdditionalInfo = req.body.pondAdditionalInfo ?? null;
        const pondType = req.body.pondType ?? 1;
        const pondRAS = req.body.pondRAS ?? false;
        const pondIPBRS = req.body.pondIPBRS ?? false;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos", "modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se verifica si el estanque ya existe
        let repeatedPond = await pool.query('SELECT * FROM `productiveUnits_ponds` WHERE productiveUnits_id = ? AND productiveUnits_ponds_name = ? AND productiveUnits_ponds_state = 1', [ productiveUnitId, pondName ]);
        repeatedPond = JSON.parse(JSON.stringify(repeatedPond));

        if (repeatedPond.length > 0) {
            // El estanque ya está registrado
            throw  `El estanque ${pondName} ya está registrado`;
        } else {
            // Se registra el estanque
            let insertPond = await pool.query('INSERT INTO `productiveUnits_ponds`(`productiveUnits_id`, `productiveUnits_ponds_name`, `productiveUnits_ponds_location`, `productiveUnits_ponds_area`, `productiveUnits_ponds_volume`, `productiveUnits_ponds_additionalInfo`, `productiveUnits_ponds_type`, `productiveUnits_ponds_RAS`, `productiveUnits_ponds_IPBRS`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [ productiveUnitId, pondName, pondLocation, pondArea, pondVolume, pondAdditionalInfo, pondType, pondRAS, pondIPBRS ]);

            res.status(200).json({pondId: insertPond.insertId});
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Editar estanques
controller.editPonds = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("pondId").notEmpty().isInt(), body("pondName").notEmpty().isString(), body("pondLocation").optional().isString(), body("pondArea").notEmpty().isFloat(), body("pondVolume").notEmpty().isFloat(), body("pondAdditionalInfo").optional().isString(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS POST
        const productiveUnitId = req.body.productiveUnitId;
        const pondId = req.body.pondId;
        const pondName = req.body.pondName;
        const pondLocation = req.body.pondLocation ?? null;
        const pondArea = req.body.pondArea;
        const pondVolume = req.body.pondVolume;
        const pondAdditionalInfo = req.body.pondAdditionalInfo ?? null;
        const pondType = req.body.pondType ?? 1;
        const pondRAS = req.body.pondRAS ?? false;
        const pondIPBRS = req.body.pondIPBRS ?? false;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos", "modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se verifica existencia del estanque
        let pondDate = await pool.query('SELECT * FROM `productiveUnits_ponds` WHERE productiveUnits_ponds_id = ?', [ pondId ]);
        pondDate = JSON.parse(JSON.stringify(pondDate));

        if (pondDate.length < 1) throw `El estanque ${pondId} no existe`;

        // Se verifica si el estanque pertenece a la unidad productiva
        if (pondDate[0].productiveUnits_id != productiveUnitId) throw `El estanque ${pondId} no pertenece a la unidad productiva`;

        // Se edita el estanque
        const result = await pool.query('UPDATE `productiveUnits_ponds` SET `productiveUnits_ponds_name`= ?,`productiveUnits_ponds_location`= ?,`productiveUnits_ponds_updateDate`= now(), `productiveUnits_ponds_area`= ?, `productiveUnits_ponds_volume`= ?, `productiveUnits_ponds_additionalInfo`= ?, `productiveUnits_ponds_type`= ?, `productiveUnits_ponds_RAS`= ?, `productiveUnits_ponds_IPBRS`= ? WHERE `productiveUnits_ponds_id` = ?', [ pondName, pondLocation, pondArea, pondVolume, pondAdditionalInfo, pondType, pondRAS, pondIPBRS, pondId ]);

        // Se verifica si se editó correctamente el estanque
        if (result.affectedRows > 0) {
            res.status(200).json({});
        } else {
            throw "Error al actualizar el estanque";
        }

    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Eliminar (Desactivar) estanques
controller.deletePonds = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("pondId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS POST
        const productiveUnitId = req.body.productiveUnitId;
        const pondId = req.body.pondId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos", "modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se verifica existencia del estanque
        let existPond = await pool.query('SELECT productiveUnits_id AS productiveUnit, productiveUnits_ponds_used AS used FROM `productiveUnits_ponds` WHERE productiveUnits_ponds_id = ?', [ pondId ]);
        existPond = JSON.parse(JSON.stringify(existPond));

        if (existPond.length < 1) throw `El estanque ${pondId} no existe`;

        // Se verifica si el estanque pertenece a la unidad productiva
        if (existPond[0].productiveUnit == productiveUnitId) throw `El estanque ${pondId} no pertenece a la unidad productiva`;

        // Se verifica que el estanque no esté en uso
        if (existPond[0].used == 1) throw `El estanque ${pondId} está en uso    `;

        const result = await pool.query('DELETE FROM `productiveUnits_ponds` WHERE `productiveUnits_ponds_id` = ?', [ pondId ]);

        // Se verifica si se editó correctamente el estanque
        if (result.affectedRows > 0) {
            res.status(200).json({});
        } else {
            throw "Error al eliminar el estanque";
        }

    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// FIN CONTROLADORES DE ESTANQUES

// INICIO DE CONTROLADORES DE MEDICINA
// Agregar medicina
controller.addMedicine = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("medicineName").notEmpty(), body("medicineGtin").notEmpty(), body("medicineBatch").notEmpty(), body("medicineExpDate").notEmpty(), body("medicineVendorNit").notEmpty(), body("medicineVendorDv").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS POST
        const productiveUnitId = req.body.productiveUnitId;
        const medicineName = req.body.medicineName;
        const medicineGtin = req.body.medicineGtin;
        const medicineBatch = req.body.medicineBatch;
        const medicineExpDate = req.body.medicineExpDate;
        const medicineVendorNit = req.body.medicineVendorNit;
        const medicineVendorDv = req.body.medicineVendorDv;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        await pool.query('INSERT INTO `productiveUnits_medicine`(`productiveUnits_id`, `productiveUnits_medicine_name`, `productiveUnits_medicine_gtin`, `productiveUnits_medicine_batch`, `productiveUnits_medicine_expDate`, `productiveUnits_medicine_vendorNit`, `productiveUnits_medicine_vendorNitDv`) VALUES (?, ?, ?, ?, ?, ?, ?)', [ productiveUnitId, medicineName, medicineGtin, medicineBatch, medicineExpDate, medicineVendorNit, medicineVendorDv ]);

        let newMedicine = await pool.query('SELECT productiveUnits_medicine_id AS id FROM `productiveUnits_medicine` WHERE productiveUnits_id = ? ORDER BY `id` DESC LIMIT 1;', [ productiveUnitId ]);
        newMedicine = JSON.parse(JSON.stringify(newMedicine));

        newMedicine = newMedicine[0].id;

        res.status(200).json({newMedicine});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

// Obtener medicinas de una unidad productiva
controller.getMedicines = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    // DATOS POST
    const productiveUnitId = req.query.productiveUnitId;

    // ID del usuario
    const userId = await getUserId(req);

    // se verifica que la unidad productiva pertenezca al usuario
    if (!await userOwnerProductiveUnit(productiveUnitId, userId,["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

    // se verifica que la unidad productiva se encuentre activa
    if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

    let medicinesActive = await pool.query('SELECT productiveUnits_medicine_id AS id, productiveUnits_medicine_name AS name, productiveUnits_medicine_gtin AS gtin, productiveUnits_medicine_batch AS batch, productiveUnits_medicine_expDate AS expDate, productiveUnits_medicine_vendorNit AS vendorNit, productiveUnits_medicine_vendorNitDv AS vendorDv FROM `productiveUnits_medicine` WHERE productiveUnits_id = ? AND productiveUnits_medicine_state = 1', [ productiveUnitId ]);
    medicinesActive = JSON.parse(JSON.stringify(medicinesActive));

    let medicinesInactive = await pool.query('SELECT productiveUnits_medicine_id AS id, productiveUnits_medicine_name AS name, productiveUnits_medicine_gtin AS gtin, productiveUnits_medicine_batch AS batch, productiveUnits_medicine_expDate AS expDate, productiveUnits_medicine_vendorNit AS vendorNit, productiveUnits_medicine_vendorNitDv AS vendorDv FROM `productiveUnits_medicine` WHERE productiveUnits_id = ? AND productiveUnits_medicine_state = 0', [ productiveUnitId ]);
    medicinesInactive = JSON.parse(JSON.stringify(medicinesInactive));

    medicines = {
        active: medicinesActive,
        inactive: medicinesInactive
    }

    res.status(200).json({medicines});
}]

// Eliminar medicina
controller.deleteMedicine = [verifyToken(config), body("medicineId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);
        const medicineId = req.body.medicineId;

        let medicineData = await pool.query('SELECT productiveUnits_id AS productiveUnitId FROM `productiveUnits_medicine` WHERE productiveUnits_medicine_id = ?', [ medicineId ]);
        medicineData = JSON.parse(JSON.stringify(medicineData));

        // Se verifica si la medicina existe
        if (!medicineData.length > 0) throw `Este medicamento no existe.`;

        const productiveUnitId = medicineData[0].productiveUnitId;

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;
        
        await pool.query('DELETE FROM `productiveUnits_medicine` WHERE `productiveUnits_medicine_id` = ?', [ medicineId ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

// Descontinuar medicinas
controller.editMedicine = [verifyToken(config), body("medicineId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);
        const medicineId = req.body.medicineId;

        let medicineData = await pool.query('SELECT productiveUnits_id AS productiveUnitId FROM `productiveUnits_medicine` WHERE productiveUnits_medicine_id = ?', [ medicineId ]);
        medicineData = JSON.parse(JSON.stringify(medicineData));

        // Se verifica si la medicina existe
        if (!medicineData.length > 0) throw `Este medicamento no existe.`;

        const productiveUnitId = medicineData[0].productiveUnitId;

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        await pool.query('UPDATE `productiveUnits_medicine` SET `productiveUnits_medicine_state` = 0 WHERE `productiveUnits_medicine_id` = ?', [ medicineId ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

// INICIO DE CONTROLADORES DE PIENSOS
// Vincular piensos después
controller.feedLinkAfter = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS POST
        const productiveUnitId = req.body.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos","modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        await pool.query('UPDATE `productiveUnits` SET `productiveUnits_body` = JSON_SET(`productiveUnits_body`, "$.profile.piensosAlevinera", true) WHERE `productiveUnits_id` = ?', [ productiveUnitId ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

// Crear pienso
controller.createFeed = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("feedName").notEmpty(), body("vendorName").notEmpty(), body("codeTypeId").notEmpty().isInt(), body("code").notEmpty(), body("batch").notEmpty(), body("expDate").notEmpty().isISO8601("yyyy-mm-dd").toDate(), body("quantity").notEmpty(), body("unitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS POST
        const productiveUnitId = req.body.productiveUnitId;
        const feedName = req.body.feedName;
        const vendorName = req.body.vendorName;
        const codeTypeId = req.body.codeTypeId;
        const code = req.body.code;
        const batch = req.body.batch;
        const expDate = req.body.expDate;
        const quantity = req.body.quantity;
        const unitId = req.body.unitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se verifica si el código de referencia es válido
        let codeType = await pool.query('SELECT referenceCodes_name  AS name, referenceCodes_rule AS rule FROM `referenceCodes` WHERE referenceCodes_id = ?', [ codeTypeId ]);
        codeType = JSON.parse(JSON.stringify(codeType));

        // Reglas del tipo de codigo
        codeRule = JSON.parse(codeType[0].rule);

        if (codeType.length < 1) throw "Tipo de codigo de referencia inválido";
        if (code.length < codeRule.min || code.length > codeRule.max) throw `El código ${code} no es un ${codeType[0].name} válido, min: ${codeRule.min} y max: ${codeRule.max}`;

        await pool.query('INSERT INTO `productiveUnits_feed`(`productiveUnits_id`, `productiveUnits_feed_name`, `productiveUnits_feed_vendorName`, `productiveUnits_feed_codeType`, `productiveUnits_feed_code`, `productiveUnits_feed_batch`, `productiveUnits_feed_expDate`, `productiveUnits_feed_quantity`, `unit_id`, `productiveUnits_feed_quantityIterator`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [ productiveUnitId, feedName, vendorName, codeTypeId, code, batch, expDate, quantity, unitId, quantity ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

// Obtener piensos
controller.getFeeds = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS GET
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos","lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se obtienen las unidades para iterar los piensos
        let units = await pool.query('SELECT units_id AS id, units_name AS name FROM `units`');
        units = JSON.parse(JSON.stringify(units));

        let unitsArray = {};

        units.forEach(element => {
            unitsArray[element.id] = element.name;
        });
        
        // Se obtienen los piensos activos
        let feedsActive = await pool.query('SELECT productiveUnits_feed_id AS id, productiveUnits_feed_name AS name, productiveUnits_feed_vendorName AS vendor, productiveUnits_feed_batch AS batch, productiveUnits_feed_quantity AS originalQuantity, productiveUnits_feed_quantityIterator AS quantity, unit_id AS unit, productiveUnits_feed_state AS state FROM `productiveUnits_feed` WHERE productiveUnits_id = ? AND productiveUnits_feed_state = 1', [ productiveUnitId ]);

        feedsActive.forEach(element => {
            element.unit = unitsArray[element.unit];
        });
        
        // Se obtienen los piensos inactivos
        let feedsInactive = await pool.query('SELECT productiveUnits_feed_id AS id, productiveUnits_feed_name AS name, productiveUnits_feed_vendorName AS vendor, productiveUnits_feed_batch AS batch, productiveUnits_feed_quantity AS originalQuantity, productiveUnits_feed_quantityIterator AS quantity, unit_id AS unit, productiveUnits_feed_state AS state FROM `productiveUnits_feed` WHERE productiveUnits_id = ? AND productiveUnits_feed_state = 0', [ productiveUnitId ]);

        feedsInactive.forEach(element => {
            element.unit = unitsArray[element.unit];
        });

        // Se construye el objeto con piensos
        let feeds = {
            active: feedsActive,
            inactive: feedsInactive
        }

        res.status(200).json({feeds});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]   

// Obtener pienso especifico
controller.getEspecifiFeed = [verifyToken(config), query("feedId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS GET
        const feedId = req.query.feedId;

        let feedData = await pool.query('SELECT productiveUnits_feed_id AS id, productiveUnits_feed_name AS name, productiveUnits_feed_vendorName AS vendor, productiveUnits_feed_batch AS batch, productiveUnits_id AS productiveUnit, productiveUnits_feed_code AS code, productiveUnits_feed_expDate AS expDate, productiveUnits_feed_quantity AS quantity FROM `productiveUnits_feed` WHERE productiveUnits_feed_id = ?', [ feedId ]);
        feedData = JSON.parse(JSON.stringify(feedData));

        if (!feedData.length > 0) throw `Este pienso no se encuentra registrado.`;

        feedData = feedData[0];

        const productiveUnitId = feedData.productiveUnit;
        feedData.productiveUnit = undefined;
        feedData.id = undefined;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos","lotes"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        res.status(200).json({feedData});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Descontinuar piensos
controller.deleteFeed = [verifyToken(config), query("feedId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS GET
        const feedId = req.query.feedId;

        let feedData = await pool.query('SELECT productiveUnits_feed_id AS id, productiveUnits_feed_name AS name, productiveUnits_feed_vendorName AS vendor, productiveUnits_feed_batch AS batch, productiveUnits_id AS productiveUnit, productiveUnits_feed_code AS code, productiveUnits_feed_expDate AS expDate, productiveUnits_feed_quantity AS quantity FROM `productiveUnits_feed` WHERE productiveUnits_feed_id = ?', [ feedId ]);
        feedData = JSON.parse(JSON.stringify(feedData));

        if (!feedData.length > 0) throw `Este pienso no se encuentra registrado.`;

        feedData = feedData[0];

        const productiveUnitId = feedData.productiveUnit;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        await pool.query('UPDATE `productiveUnits_feed` SET `productiveUnits_feed_state` = 0 WHERE `productiveUnits_feed_id` = ?', [ feedId ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }

}];

// Agregar permiso de unidad productiva
controller.addPermit = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("permName").notEmpty(), body("permEntity").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // Datos POST
        const permName = req.body.permName;
        const permEntity = req.body.permEntity;
        const productiveUnitId = req.body.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        if (req.files && req.files.permDocument) {
            // Ruta dónde guardar el archivo
            let folder = "./src/public/content/productiveUnits/permits/";

            // Se obtiene el archivo
            let permDocument = req.files.permDocument;

            // Se valida que el archivo sea PDF
            if (permDocument.mimetype != 'application/pdf') throw "El certificado solo puede ser un PDF";

            // Se genera nombre aleatorio
            let fileName = genRandomString(12)+".pdf";

            // Se guarda el archivo
            permDocument.mv(folder+fileName);

            // Se verifica si ya se había agregado un permiso anteriormente
            let hasPermits = await pool.query('SELECT * FROM `productiveUnits_perms` WHERE productiveUnits_id = ?', [ productiveUnitId ]);
            hasPermits = JSON.parse(JSON.stringify(hasPermits));
            if (!hasPermits.length > 0) {
                await pool.query(`UPDATE productiveUnits SET productiveUnits_body = JSON_SET(productiveUnits_body, "$.profile.permisosAlevinera", true) WHERE productiveUnits_id = ?`, [ productiveUnitId ]);
            }

            await pool.query('INSERT INTO `productiveUnits_perms`(`productiveUnits_id`, `productiveUnits_perms_name`, `productiveUnits_perms_entity`, `productiveUnits_perms_url`) VALUES (?, ?, ?, ?)', [ productiveUnitId, permName, permEntity, fileName ]);

            res.status(200).json({});
        } else {
            throw "El documento es obligatorio";
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Editar permiso de unidad productiva
controller.editPermit = [verifyToken(config), body("permId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // Datos POST
        const permName = req.body.permName;
        const permEntity = req.body.permEntity;
        const permId = req.body.permId;
        let permUrl = "";

        // ID del usuario
        const userId = await getUserId(req);

        // Datos de permisos 
        let permData = await pool.query('SELECT productiveUnits_perms_id AS id, productiveUnits_perms_name AS name, productiveUnits_perms_entity AS entity, productiveUnits_perms_url AS url, productiveUnits_id AS productiveId FROM `productiveUnits_perms` WHERE productiveUnits_perms_id = ?;', [ permId ]);
        permData = JSON.parse(JSON.stringify(permData));

        // ID de unidad productiva
        const productiveUnitId = permData[0].productiveId;

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        if (req.files && req.files.permDocument) {
            // Ruta dónde guardar el archivo
            let folder = "./src/public/content/productiveUnits/permits/";

            // Se obtiene el archivo
            let permDocument = req.files.permDocument;

            // Se valida que el archivo sea PDF
            if (permDocument.mimetype != 'application/pdf') throw "El certificado solo puede ser un PDF";

            // Se genera nombre aleatorio
            let fileName = genRandomString(12)+".pdf";

            // Se guarda el archivo
            permDocument.mv(folder+fileName);

            permUrl = fileName;
        }else{
            permUrl = permData[0].url;
        }

        await pool.query('UPDATE `productiveUnits_perms` SET `productiveUnits_perms_name`= ?,`productiveUnits_perms_entity`= ?,`productiveUnits_perms_url`= ? WHERE `productiveUnits_perms_id` = ?', [ permName, permEntity, permUrl, permId ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener permisos de unidad productiva
controller.getPermit = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // Datos GET
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        let permits = await pool.query('SELECT productiveUnits_perms_id AS id, productiveUnits_perms_name AS name, productiveUnits_perms_entity AS entity, productiveUnits_perms_url AS url FROM `productiveUnits_perms` WHERE productiveUnits_id = ?;', [ productiveUnitId ]);
        permits = JSON.parse(JSON.stringify(permits));

        res.status(200).json({permits});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Marcar que no se tienen permisos
controller.permitLinkAfter = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS POST
        const productiveUnitId = req.body.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        await pool.query(`UPDATE productiveUnits SET productiveUnits_body = JSON_SET(productiveUnits_body, "$.profile.permisosAlevinera", true) WHERE productiveUnits_id = ?`, [ productiveUnitId ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener certificados de unidad productiva
controller.getCertificates = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // Datos GET
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        let certificatesGroups = await pool.query('SELECT certificationsGroups_id AS id, certificationsGroups_name AS name FROM `certificationsGroups`;');
        certificatesGroups = JSON.parse(JSON.stringify(certificatesGroups));

        for (let index = 0; index < certificatesGroups.length; index++) {
            const element = certificatesGroups[index];

            // Se consultan los certificados de cada grupo
            let certificates = await pool.query('SELECT certifications_id AS id, certifications_name AS name FROM `certifications` WHERE certificationsGroups_id = ?', [ element.id ]);
            certificates = JSON.parse(JSON.stringify(certificates));

            for (let index = 0; index < certificates.length; index++) {
                const element = certificates[index];
                
                let hasCert = await pool.query('SELECT * FROM `productiveUnits_certs` WHERE productiveUnits_id = ? AND certifications_id = ?', [ productiveUnitId, element.id ]);
                hasCert = JSON.parse(JSON.stringify(hasCert));

                if (hasCert.length > 0) {
                    element.has = true;
                }else{
                    element.has = false;
                }
            }

            element.certificates = certificates;
        }

        res.status(200).json({certificatesGroups});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener certificados de unidad productiva
controller.addCertificate = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("certificateId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // Datos POST
        const productiveUnitId = req.body.productiveUnitId;
        const certificateId = req.body.certificateId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Se verifica que el tipo de certificado exista
        let existCertificate = await pool.query('SELECT * FROM `certifications` WHERE certifications_id = ?', [ certificateId ]);
        existCertificate = JSON.parse(JSON.stringify(existCertificate));

        if (!existCertificate.length > 0) throw `El certificado ${certificateId} no existe`;

        // Se guarda y registra el certificado
        if (req.files && req.files.certificateDocument) {
            // Ruta dónde guardar el archivo
            let folder = "./src/public/content/productiveUnits/certificates/";

            // Se obtiene el archivo
            let certificateDocument = req.files.certificateDocument;

            // Se valida que el archivo sea PDF
            if (certificateDocument.mimetype != 'application/pdf') throw "El certificado solo puede ser un PDF";

            // Se genera nombre aleatorio
            let fileName = genRandomString(12)+".pdf";

            // Se guarda el archivo
            certificateDocument.mv(folder+fileName);

            // Se verifica si ya se había agregado un permiso anteriormente
            let hasCerts = await pool.query('SELECT * FROM `productiveUnits_certs` WHERE productiveUnits_id = ?', [ productiveUnitId ]);
            hasCerts = JSON.parse(JSON.stringify(hasCerts));
            if (!hasCerts.length > 0) {
                await pool.query(`UPDATE productiveUnits SET productiveUnits_body = JSON_SET(productiveUnits_body, "$.profile.certificacionesAlevinera", true) WHERE productiveUnits_id = ?`, [ productiveUnitId ]);
            }

            await pool.query('INSERT INTO `productiveUnits_certs`(`productiveUnits_id`, `certifications_id`, `productiveUnits_certs_url`) VALUES (?, ?, ?)', [ productiveUnitId, certificateId, fileName ]);

            res.status(200).json({});
        }else{
            throw "El documento es obligatorio";
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Marcar se llenan después las certificaciones
controller.certificatesLinkAfter = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS POST
        const productiveUnitId = req.body.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["modifyProductiveUnit"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        await pool.query(`UPDATE productiveUnits SET productiveUnits_body = JSON_SET(productiveUnits_body, "$.profile.certificacionesAlevinera", true) WHERE productiveUnits_id = ?`, [ productiveUnitId ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener personal de trazabilida
controller.traceabilityStaff = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS POST
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId)) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        let traceabilityStaff = await pool.query(`SELECT traceabilityStaff_id AS id, users_id AS user, traceabilityStaff_perms AS perms, traceabilityStaff_state AS state  FROM traceabilityStaff WHERE productiveUnits_id = ?`, [ productiveUnitId ]);
        traceabilityStaff = JSON.parse(JSON.stringify(traceabilityStaff));

        for (let index = 0; index < traceabilityStaff.length; index++) {
            const element = traceabilityStaff[index];

            const userId = element.user;
            const staffId = element.id;

            if (userId != null) {
                let userData = await fetch(`${config.apisRoute}/users/otherData?user=${userId}`, {
                    method: 'GET',
                    headers: { "Authorization": config.trazulKey }
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

                element.user = userData.userData.email ?? "";
            }else{
                let userEmail = await pool.query('SELECT user_email AS email FROM `traceabilityStaff_invitations` WHERE traceabilityStaff_id = ?', [ staffId ]);
                userEmail = JSON.parse(JSON.stringify(userEmail));

                element.user = userEmail[0].email;
            }

            element.perms = JSON.parse(element.perms);

            switch (element.state) {
                case 0:
                    element.state = "Pendiente";
                    break;

                case 1:
                    element.state = "Aceptado";
                    break;

                case 2:
                element.state = "Rechazado";
                break;

                default:
                    element.state = null;
                    break;
            }
        }

        res.status(200).json({traceabilityStaff});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

controller.addTraceabilityStaff = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("email").notEmpty(), body("perms").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // DATOS POST
        const productiveUnitId = req.body.productiveUnitId;
        const email = req.body.email;
        let perms = req.body.perms;

        // ID del usuario
        const userId = await getUserId(req);

        const authorization = await getUserAuth(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId)) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        let user = await fetch(config.apisRoute+"/users/dataWithEmail?email="+email, {
            method: 'GET',
            headers: { "Authorization": authorization }
        }).then(async response =>  {
            if (response.status === 200) {
                return await response.json();
            }else{
                error = await response.json();
    
                throw error;
            }
        }).catch(err => {
            throw err;
        });

        // Se parsea el resultado del fetch
        user = user.userData.user;

        // Se obtienen los datos de la unidad productiva
        let productiveUnitData = await pool.query('SELECT JSON_EXTRACT(productiveUnits_body, "$.profile") AS body, productiveUnits_types_id AS type, users_id AS users_id FROM `productiveUnits` WHERE productiveUnits_id = ?', [ productiveUnitId ]);
        productiveUnitData = JSON.parse(JSON.stringify(productiveUnitData));

        let productiveUnitName = "";
        let type = productiveUnitData[0].type;
        let productiveOwnerId = productiveUnitData[0].users_id

        productiveUnitData = JSON.parse(productiveUnitData[0].body);

        // Se itera el body dependiendo del type para obtener el nombre de la unidad productiva
        switch (type) {
            case 1:
                productiveUnitName = JSON.parse(productiveUnitData.informacionAlevinera).name;
                break;
            case 2:
                // Temporal, debería ser informacionEngorde
                productiveUnitName = JSON.parse(productiveUnitData.informacionAlevinera).name;
                break;
            default:
                productiveUnitName = null;
                break;
        }

        // Se parsean los permisos
        perms = JSON.parse(perms);

        for (let index = 0; index < perms.length; index++) {
            let element = perms[index];

            if (element != "all" && element != "lotes" && element != "insumos" && element != "despachos" && element != "trazabilidad" && element != "modifyProductiveUnit" && element != "contabilidad") {
                perms.splice(index, 1);
            }
        }

        // Se parsean los permisos
        perms = JSON.stringify(perms);

        // Se verifica si el usuario existe o no existe
        if (user.length > 0) {
            let userHash = user[0].hash;
            
            // Se verifica si el usuario está registrado en trazul
            userInTrazul = await pool.query('SELECT * FROM `users` WHERE users_code = ?', [ userHash ]);
            userInTrazul = JSON.parse(JSON.stringify(userInTrazul));

            if (userInTrazul.length > 0) {
                // ID del usuario
                userIdTrazul = userInTrazul[0].users_id;

                if (userIdTrazul != productiveOwnerId && userIdTrazul != userId) {
                    // Se verifica si el usuario hace parte del staff o ya fue invitado previamente
                    let userHasInvited = await pool.query('SELECT * FROM `traceabilityStaff` WHERE productiveUnits_id = ? AND users_id = ?', [ productiveUnitId, userIdTrazul ]);
                    userHasInvited = JSON.parse(JSON.stringify(userHasInvited));

                    if (!userHasInvited.length > 0) {

                        // Se registra al usuari en el staff
                        await pool.query('INSERT INTO `traceabilityStaff`(`productiveUnits_id`, `users_id`, `traceabilityStaff_perms`) VALUES (?, ?, ?)', [ productiveUnitId, userIdTrazul, perms ]);

                        let linkAccept = config.apisRoute+"/users/acceptStaffEmail?u="+userIdTrazul+"&p="+productiveUnitId;
                        let linkReject = config.apisRoute+"/users/rejectStaffEmail?u="+userIdTrazul+"&p="+productiveUnitId;

                        sendMail(email, `Invitación Personal De Trazabilidad de ${productiveUnitName}`, {user: email, productiveUnitName, linkAccept, linkReject}, "acceptStaffInvitation1");

                        res.status(200).json({});
                    }else{
                        // Se verifica si el usuario ha rechazado la invitación
                        if (userHasInvited[0].traceabilityStaff_state = 2) {
                            await pool.query('UPDATE `traceabilityStaff` SET `traceabilityStaff_state`= 0 WHERE `traceabilityStaff_id` = ?', [ userHasInvited[0].traceabilityStaff_id ]);
                        } 
                        
                        let linkAccept = config.apisRoute+"/users/acceptStaffEmail?u="+userIdTrazul+"&p="+productiveUnitId;
                        let linkReject = config.apisRoute+"/users/rejectStaffEmail?u="+userIdTrazul+"&p="+productiveUnitId;

                        sendMail(email, `Invitación Personal De Trazabilidad de ${productiveUnitName}`, {user: email, productiveUnitName, linkAccept, linkReject}, "acceptStaffInvitation1");

                        res.status(204).json("El usuario ya ha sido invitado, se reenviara el correo de confirmación");
                    }
                }else{
                    res.status(406).json("El usuario intenta invitarse a si mismo o al dueño de la unidad productiva");
                }
            } else {
                res.status(205).json("El usuario existe y no está en trazul");
            }
        } else {
            // Se construye el link de rechazar invitacion
            let linkReject = config.apisRoute+"/users/rejectStaffEmail?e="+email+"&p="+productiveUnitId;

            // Se verifica si el usuario fue previamente invitado
            let hasPrevInvited = await pool.query('SELECT * FROM `traceabilityStaff_invitations`AS a LEFT JOIN traceabilityStaff AS b ON b.traceabilityStaff_id = a.traceabilityStaff_id WHERE a.user_email = ? AND b.productiveUnits_id = ?', [ email, productiveUnitId ]);
            hasPrevInvited = JSON.parse(JSON.stringify(hasPrevInvited));

            if (hasPrevInvited.length > 0) {
                sendMail(email, `Invitación Personal De Trazabilidad de ${productiveUnitName}`, {user: email, productiveUnitName, linkReject}, "acceptStaffInvitation2");
    
                res.status(200).json({});
            }else{
                await pool.query('INSERT INTO `traceabilityStaff`(`productiveUnits_id`, `traceabilityStaff_perms`) VALUES (?, ?)', [ productiveUnitId, perms ]);

                let lastPerm = await pool.query('SELECT traceabilityStaff_id AS id FROM `traceabilityStaff` WHERE productiveUnits_id = ? ORDER BY traceabilityStaff_id DESC LIMIT 1', [ productiveUnitId ]);
                lastPerm = JSON.parse(JSON.stringify(lastPerm));
    
                await pool.query('INSERT INTO `traceabilityStaff_invitations`(`user_email`, `traceabilityStaff_id`) VALUES (?, ?)', [ email, lastPerm[0].id ]);
    
                sendMail(email, `Invitación Personal De Trazabilidad de ${productiveUnitName}`, {user: email, productiveUnitName, linkReject}, "acceptStaffInvitation2");
    
                res.status(200).json({});
            }
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}]

// Eliminar staff de trazabilidad
controller.deleteTraceabilityStaff = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("staffId").notEmpty().isInt(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);

        // DATOS POST
        const productiveUnitId = req.body.productiveUnitId;
        const staffId = req.body.staffId;

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId)) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        let staffExist = await pool.query('SELECT * FROM `traceabilityStaff` WHERE traceabilityStaff_id = ? AND productiveUnits_id = ?', [ staffId, productiveUnitId ]);
        staffExist = JSON.parse(JSON.stringify(staffExist));

        if (staffExist.length > 0) {
            await pool.query('DELETE FROM `traceabilityStaff_invitations` WHERE `traceabilityStaff_id` = ?', [ staffId ]);
            await pool.query('DELETE FROM `traceabilityStaff` WHERE `traceabilityStaff_id` = ?', [ staffId ]);

            res.status(200).json({});
        } else {
            throw "El usuario no pertenece a la unidad productiva";
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Editar staff de trazabilidad
controller.editTraceabilityStaff = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("staffId").notEmpty().isInt(), body("perms").notEmpty(), handleValidationErrors, async(req, res) => {
    try {
        // ID del usuario
        const userId = await getUserId(req);

        // DATOS POST
        const productiveUnitId = req.body.productiveUnitId;
        const staffId = req.body.staffId;

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId)) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        let staffExist = await pool.query('SELECT users_id AS userId FROM `traceabilityStaff` WHERE traceabilityStaff_id = ? AND productiveUnits_id = ?', [ staffId, productiveUnitId ]);
        staffExist = JSON.parse(JSON.stringify(staffExist));

        if (staffExist.length > 0) {

            // Se verifica que el usuario no intente editar sus propios permisos
            if (userId == staffExist[0].id) {
                throw "No puedes editar tu propio usuario"
            } else {
                let perms = req.body.perms;

                // Se parsean los permisos
                perms = JSON.parse(perms);

                for (let index = 0; index < perms.length; index++) {
                    let element = perms[index];

                    if (element != "all" && element != "lotes" && element != "insumos" && element != "despachos" && element != "trazabilidad" && element != "modifyProductiveUnit") {
                        perms.splice(index, 1);
                    }
                }

                // Se parsean los permisos
                perms = JSON.stringify(perms);

                // Se actualizan los permisos
                await pool.query('UPDATE `traceabilityStaff` SET `traceabilityStaff_perms`= ? WHERE `traceabilityStaff_id` = ?', [ perms, staffId ]);

                res.status(200).json({});
            }
        } else {
            throw "El usuario no pertenece a la unidad productiva";
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Crear alevino para engorde
controller.createFingerlingsEngorde = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("specie").notEmpty().isInt(), body("harvestDate").notEmpty().isISO8601("yyyy-mm-dd").toDate(), body("quantity").notEmpty().isInt(), body("age").notEmpty().isInt(), body("ageUnit").notEmpty().isInt(), body("referenceCode").notEmpty(), handleValidationErrors, async(req, res) => { 
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.body.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Datos de los padrotes
        const specie = req.body.specie;
        const quantity = req.body.quantity;
        const harvestDate  = req.body.harvestDate;
        let age = req.body.age ?? "";
        let ageUnit = req.body.ageUnit ?? "";
        const referenceCode  = req.body.referenceCode;

        // // Se verifica si el código de referencia es válido
        // let codeType = await pool.query('SELECT referenceCodes_name  AS name, referenceCodes_rule AS rule FROM `referenceCodes` WHERE referenceCodes_id = ?', [ referenceCodeType ]);
        // codeType = JSON.parse(JSON.stringify(codeType));

        // Reglas del tipo de codigo
        // codeRule = JSON.parse(codeType[0].rule);

        // if (codeType.length < 1) throw "Tipo de codigo de referencia inválido";
        // if (referenceCode.length < codeRule.min || referenceCode.length > codeRule.max) throw `El código ${referenceCode} no es un ${codeType[0].name} válido, min: ${codeRule.min} y max: ${codeRule.max}`;

        // Se verifica si es la primera vez que se registra un alevino
        let prevFingerlings = await pool.query('SELECT * FROM `productiveUnits_fingerlings` WHERE productiveUnits_id = ?', [ productiveUnitId ]);
        prevFingerlings = JSON.parse(JSON.stringify(prevFingerlings));

        if (prevFingerlings.length < 1) {
            await pool.query('UPDATE `productiveUnits` SET `productiveUnits_body` = JSON_SET(`productiveUnits_body`, "$.profile.informacionAlevinos", true) WHERE `productiveUnits_id` = ?', [ productiveUnitId ]);
        }

        const fingerlingsBody = {
            quantity,
            harvestDate,
            age,
            ageUnit,
            referenceCode
        }

        await pool.query('INSERT INTO `productiveUnits_fingerlings`(`productiveUnits_id`, `specie_id`, `productiveUnits_fingerlings_body`) VALUES (?, ?, ?)', [ productiveUnitId, specie, JSON.stringify(fingerlingsBody) ]);
    
        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Obtener alevinos de engorde
controller.informacionFingerlingsEngorde = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => { 
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Obtener alevineros activos
        let fingerlingsActive = await pool.query(`SELECT productiveUnits_fingerlings_id AS id, specie_id AS specie, productiveUnits_fingerlings_date AS date FROM productiveUnits_fingerlings WHERE productiveUnits_id = ? AND productiveUnits_fingerlings_state = 1`, [ productiveUnitId ]);
        fingerlingsActive = JSON.parse(JSON.stringify(fingerlingsActive));

        // Obtener alevineros inactivos
        let fingerlingsInactive = await pool.query(`SELECT productiveUnits_fingerlings_id AS id, specie_id AS specie, productiveUnits_fingerlings_date AS date FROM productiveUnits_fingerlings WHERE productiveUnits_id = ? AND productiveUnits_fingerlings_state = 0`, [ productiveUnitId ]);
        fingerlingsInactive = JSON.parse(JSON.stringify(fingerlingsInactive));

        // Se obtien las especies para igualar los ID a los nombres de las especies
        let species = await fetch(`${config.apisRouteRedAzul}/general/species?flag=*`, {    
            method: "GET"
        }).then(async response =>  {
            if (response.status === 200) {
                speciesJson = await response.json();
                speciesJson = speciesJson.speciesTypes;
                speciesParsed = {};

                for (let index = 0; index < speciesJson.length; index++) {
                    const element = speciesJson[index];
                    
                    speciesParsed[element.id] = element.vulgarName;
                }

                return speciesParsed;
            }else{
                res.status(response.status).json(await response.json());
            }
        });

        // Se hace la traducción de ID a nombre en caso de que hayan registros de padrotes
        if (fingerlingsActive.length > 0) {
            for (let index = 0; index < fingerlingsActive.length; index++) {
                const element = fingerlingsActive[index];
                element.specie = species[element.specie] ?? null;
            }
        }

        if (fingerlingsInactive.length > 0) {
            for (let index = 0; index < fingerlingsInactive.length; index++) {
                const element = fingerlingsInactive[index];
                element.specie = species[element.specie] ?? null;
            }
        }

        fingerlings = {
            "active": fingerlingsActive,
            "inactive": fingerlingsInactive
        }

        res.status(200).json({fingerlings});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Descontinuar alevinos de engorde
controller.editFingerlings = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("fingerlings").notEmpty().isInt(), handleValidationErrors, async(req, res) => { 
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.body.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Obtener id de alevino
        const fingerlings = req.body.fingerlings;

        let existFingerlings = await pool.query('SELECT * FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ?', [ fingerlings ]);
        existFingerlings = JSON.parse(JSON.stringify(existFingerlings));

        if(existFingerlings.length < 1) throw "El alevino no existe";

        await pool.query('UPDATE `productiveUnits_fingerlings` SET `productiveUnits_fingerlings_state`= 0 WHERE `productiveUnits_fingerlings_id` = ?', [ fingerlings ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Información especifica de alevino de engorde
controller.specificFingerling = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), query("fingerlings").notEmpty().isInt(), handleValidationErrors, async(req, res) => { 
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Obtener id de alevino
        const fingerlings = req.query.fingerlings;

        let existFingerlings = await pool.query('SELECT specie_id AS specie, productiveUnits_fingerlings_body AS body, productiveUnits_fingerlings_date AS date FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ?', [ fingerlings ]);
        existFingerlings = JSON.parse(JSON.stringify(existFingerlings));

        if(existFingerlings.length < 1) throw "El alevino no existe";

        let body = JSON.parse(existFingerlings[0].body);

        // Se consulta el tipo de unidad de edad
        let unitAge = await pool.query('SELECT ageUnits_singularName AS singular, ageUnits_pluralName AS plural FROM `ageUnits` WHERE ageUnits_id = ?', [ body.ageUnit ]);
        unitAge = JSON.parse(JSON.stringify(unitAge));

        if (body.age == 1) {
            unitAge = unitAge[0].singular;
        } else {
            unitAge = unitAge[0].plural;
        }

        existFingerlings[0].quantity = body.quantity;
        existFingerlings[0].harvestDate = body.harvestDate;
        existFingerlings[0].age = body.age;
        existFingerlings[0].ageUnit = unitAge;
        existFingerlings[0].referenceCode = body.referenceCode;

        // Se traduce el ID de la especie a nombre vulgar
        let specieData = await fetch(config.apisRouteRedAzul+"/general/species?flag="+existFingerlings[0].specie,{
            method: "GET",
            headers: { "Authorization": config.authRedAzul }
        }).then(async response => { 
            if (response.ok) {
                return await response.json();
            } else {
                return {};
            }
        })

        existFingerlings[0].specie = specieData.speciesTypes[0].vulgarName;

        // Se elimina el body
        existFingerlings[0].body = undefined;

        res.status(200).json({data: existFingerlings});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Información especifica de alevino de engorde
controller.createFingerlingsEngordeToken = [verifyToken(config), body("productiveUnitId").notEmpty().isInt(), body("token").notEmpty(), handleValidationErrors, async(req, res) => { 
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.body.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        // Token de alevinos
        let dispatch = await pool.query('SELECT dispatch_id AS id, batches_token AS batchToken, dispatch_body AS body,dispatch_state AS state FROM `dispatch` WHERE dispatch_token = ?', [ req.body.token ]);
        dispatch = JSON.parse(JSON.stringify(dispatch));

        if (dispatch.length < 1) throw `El token ${req.body.token} no existe.`;

        if (dispatch[0].state == 1) throw `El token ${req.body.token} ya fue utilizado.`;

        // Se extrae y se parsea el body del despacho
        dispatchBody = JSON.parse(dispatch[0].body);

        // Se obtiene la cantidad de individuos
        let quantity = dispatchBody.quantityFish;

        // Se obtienen los datos del lote
        let batch = await pool.query('SELECT batches_body AS body, batches_prevToken AS prevToken, batchesTypes_id AS type FROM `batches` WHERE batches_token = ?', [ dispatch[0].batchToken ]);
        batch = JSON.parse(JSON.stringify(batch));

        // Se extrae y se parsea el body del despacho
        batchBody = JSON.parse(batch[0].body);

        let serial = batchBody.serial;

        // Se verifica si el lote es derivado o mixto
        if(batch[0].type == 2 || batch[0].type == 3){
            let prevBatch = JSON.parse(batch[0].prevToken);

            let fatherBatch = await pool.query('SELECT batches_body AS body FROM `batches` WHERE batches_token = ?', [ prevBatch[0] ]);
            fatherBatch = JSON.parse(JSON.stringify(fatherBatch));

            batchBody = JSON.parse(fatherBatch[0].body);
        }

        // Se obtiene la especie
        let specie = batchBody.specie;

        // Se obtiene la edad y la unidad
        let age = batchBody.age;
        let ageUnit = batchBody.ageUnit;

        // Se obtiene la fecha de cosecha
        let harvestDate = batchBody.harvestDate;

        // Se contruye el body del alevino
        let fingerlingsBody = {
            quantity,
            harvestDate,
            age,
            ageUnit,
            referenceCode: serial,
        }

        // Se registra el alevino
        await pool.query('INSERT INTO `productiveUnits_fingerlings`(`productiveUnits_id`, `batches_token`, `specie_id`, `productiveUnits_fingerlings_body`) VALUES (?, ?, ?, ?)', [ productiveUnitId, dispatch[0].batchToken, specie, JSON.stringify(fingerlingsBody) ]);

        // Se actualiza el estado del despacho
        await pool.query('UPDATE `dispatch` SET `dispatch_state`= 1, dispatch_updateDate = now() WHERE dispatch_id = ?', [ dispatch[0].id ]);

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Despachos especifica de alevino de engorde
controller.checkFingerlignsDispatch = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), handleValidationErrors, async(req, res) => { 
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        //if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        let ownerCode = await pool.query('SELECT b.users_code AS code FROM `productiveUnits` AS a LEFT JOIN users AS b ON a.users_id = b.users_id WHERE productiveUnits_id = ?', [ productiveUnitId ]);
        ownerCode = JSON.parse(JSON.stringify(ownerCode));

        let userData = await fetch(config.apisRouteRedAzul+"/users/data?userHash="+ownerCode[0].code,{
            method: "GET",
            headers: { "Authorization": config.authRedAzul }
        }).then(async response => { 
            if (response.ok) {
                return await response.json();
            } else {
                return {};
            }
        })

        let onwerEmail = userData.userData.email ?? "";

        let dispatchsPending = await pool.query('SELECT dispatch_token AS token, batches_token AS batchToken, dispatch_body AS body FROM `dispatch` WHERE JSON_EXTRACT(dispatch_body, "$.client.email") = ? AND dispatch_state = 0', [ onwerEmail ]);
        dispatchsPending = JSON.parse(JSON.stringify(dispatchsPending));

        for (let index = 0; index < dispatchsPending.length; index++) {
            const element = dispatchsPending[index];

            // Se obtiene y se parsea el body del despacho
            dispatchBody = JSON.parse(element.body);

            // Se elimina el body del despacho
            element.body = undefined;

            // Se agregan la cantidad de individuos
            element.quantity = dispatchBody.quantityFish + " Alevinos";

            // Se obtienen los datos del lote
            let batch = await pool.query('SELECT batches_body AS body, batches_prevToken AS prevToken, batchesTypes_id AS type, JSON_UNQUOTE(JSON_EXTRACT(JSON_UNQUOTE(JSON_EXTRACT(productiveUnits_body, CONCAT("$.profile." ,JSON_UNQUOTE(JSON_EXTRACT(JSON_KEYS(JSON_EXTRACT(productiveUnits_body, "$.profile"), "$[0]"), "$[0]"))))), "$.name")) AS name FROM `batches` AS a LEFT JOIN productiveUnits AS b ON b.productiveUnits_id = a.batches_productiveUnit WHERE batches_token = ?', [ element.batchToken ]);
            batch = JSON.parse(JSON.stringify(batch));

            if(batch[0].type == 4 || batch[0].type == 5 || batch[0].type == 6){
                dispatchsPending[index] = undefined;
                continue;
            }

            // Se agrega el nombre de la unidad productiva que generó el despacho
            element.productiveUnitName = batch[0].name;

            let batchBody = JSON.parse(batch[0].body);

            // Se verifica si el lote es derivado o mixto
            if(batch[0].type == 2 || batch[0].type == 3){
                let prevBatch = JSON.parse(batch[0].prevToken);

                let fatherBatch = await pool.query('SELECT batches_body AS body FROM `batches` WHERE batches_token = ?', [ prevBatch[0] ]);
                fatherBatch = JSON.parse(JSON.stringify(fatherBatch));

                batchBody = JSON.parse(fatherBatch[0].body);
            }

            // Se traduce el ID de la especie a nombre vulgar
            let specieData = await fetch(config.apisRouteRedAzul+"/general/species?flag="+batchBody.specie,{
                method: "GET",
                headers: { "Authorization": config.authRedAzul }
            }).then(async response => { 
                if (response.ok) {
                    return await response.json();
                } else {
                    return {};
                }
            })

            element.specie = specieData.speciesTypes[0].vulgarName ?? "";

            element.batchToken = undefined;

            dispatchsPending[index] = element
        }

        res.status(200).json({dispatchsPending});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Aceptar despacho de alevinos
controller.accetpFingerlignsDispatch = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), query("token").notEmpty(), handleValidationErrors, async(req, res) => { 
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // Auth de usuario
        let auth = getUserAuth(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        const token = req.query.token;

        await fetch(config.apisRoute+"/productiveUnits/edit/informacionFingerlingsEngordeToken",{
            method: "POST",
            headers: { "Authorization": auth, "Content-Type": "application/json" },
            body: JSON.stringify({ productiveUnitId, token })
        }).then(async response => { 
            if (response.ok) {
                res.status(200).json({});
            } else {
                return {};
            }
        })
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];

// Rechazar despacho de alevinos
controller.rejectFingerlignsDispatch = [verifyToken(config), query("productiveUnitId").notEmpty().isInt(), query("token").notEmpty(), handleValidationErrors, async(req, res) => { 
    try {
        // ID de la unidad productiva
        const productiveUnitId = req.query.productiveUnitId;

        // ID del usuario
        const userId = await getUserId(req);

        // se verifica que la unidad productiva pertenezca al usuario
        if (!await userOwnerProductiveUnit(productiveUnitId, userId, ["insumos"])) throw `Esta unidad productiva no pertenece a este usuario.`;

        // se verifica que la unidad productiva se encuentre activa
        if (!await productiveUnitActive(productiveUnitId)) throw `Esta unidad productiva no se encuentra activa.`;

        const token = req.query.token;

        // Se obtienen los datos del usuario propietario del despacho
        let ownerDispatch = await pool.query('SELECT d.users_code AS code, a.dispatch_state AS state, dispatch_date AS date FROM `dispatch` AS a LEFT JOIN batches AS b ON b.batches_token = a.batches_token LEFT JOIN productiveUnits AS c ON c.productiveUnits_id = b.batches_productiveUnit LEFT JOIN users AS d ON d.users_id = c.users_id WHERE a.dispatch_token = ?', [ token ]);
        ownerDispatch = JSON.parse(JSON.stringify(ownerDispatch));

        if(ownerDispatch[0].state != 0) throw `El token ${token} ya fue utilizado`;

        // Se actualiza el despacho como rechazado
        await pool.query('UPDATE `dispatch` SET `dispatch_state`= 2, dispatch_updateDate = now() WHERE dispatch_token = ?', [ token ]);

        let userData = await fetch(config.apisRouteRedAzul+"/users/data?userHash="+ownerDispatch[0].code,{
            method: "GET",
            headers: { "Authorization": config.authRedAzul }
        }).then(async response => { 
            if (response.ok) {
                return await response.json();
            } else {
                return {};
            }
        })

        let onwerEmail = userData.userData.email;

        let date = ownerDispatch[0].date;

        date = new Date(date);

        let formatedDate = date.toISOString().replace("T", " ").replace(/\.\d+Z/, "");

        // Correo para propietario del despacho
        await sendMail(onwerEmail, `El despacho de tu lote: ${token} ha sido rechazado`, {user: onwerEmail, token, date: formatedDate}, "notifyDispatchRejected");

        res.status(200).json({});
    } catch (error) {
        console.log(error);
        res.status(400).json({error});
    }
}];


module.exports = controller;