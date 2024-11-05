// COMMONS DE LOTES

// Configuración de las API's
const config = require("../configApis");

// Libs
const pool = require("../../../../config/dbConnections"+config.DBName);
const fetch = require('node-fetch');
const { validProductiveUnitType, getUserId, userOwnerProductiveUnit, productiveUnitActive, getUserHash, getUserAuth } = require("./productiveUnitsEdit");
const { specieName, formatDate, ageUnit, broodstockData, feedData, medicineData, pondData, dispatchData, fingerlingsData } = require("./batchesAux");

// Función para construir objeto con información de trazabilidad según el tipo de lote
async function constructTraceability(token, type, body, prevToken) {
    // Se parsea el body del lote
    body = JSON.parse(body);

    // Se invoca a la función constructora dependiendo del tipo de lote
    switch (type) {
        case 1:
            body = await basicHatchery(token, body);
            break;

        case 2:
            body = await derivedHatchery(body, prevToken);
            break;

        case 3:
            body = await mixedHatchery(body, prevToken);
            break;

        case 4:
            body = await basicFishFarming(token, body);
            break;
            
        case 5:
            body = await derivedFishFarming(body, prevToken);
            break;

        case 6:
            body = await mixedFishFarming(body, prevToken);
            break;
            
        default:
            body = null;
    }

    return body;
}

// Constructor de trazabilidad para lote basico de alevinera
async function basicHatchery(token, body) {
    // Se eliminan los datos innecesarios
    body.productiveUnitId = undefined;

    // Se consulta el nombre de la especie
    body.specie = await specieName(body.specie);

    // Se traduce la unidad de edad (Dias o meses)
    body.ageUnit = await ageUnit(body.age, body.ageUnit);

    // Se traduce la fecha de cosecha al formato DD/MM(Texto)/AA
    body.harvestDate = formatDate(body.harvestDate);

    // Se agrega la palabra alevinos a la cantidad inicical de individuos
    body.quantityFish += " Alevinos";

     // Se agrega la palabra alevinos a la cantidad actual de individuos
    body.quantityFishIterator += " Alevinos";

    // Se obtienen los datos del padrote
    body.broodstock = await broodstockData(body.broodstock);

    // Se obtienen los datos de los piensos
    let feed = await pool.query('SELECT pf.productiveUnits_feed_name AS name, pf.productiveUnits_feed_batch AS batch, pf.productiveUnits_feed_id AS id, bf.batches_feed_quantity AS quantity, productiveUnits_feed_price AS price FROM `batches_feed` AS bf LEFT JOIN batches AS b ON b.batches_id = bf.batches_id LEFT JOIN productiveUnits_feed AS pf ON pf.productiveUnits_feed_id = bf.productiveUnits_feed_id WHERE b.batches_token = ?;', [ token ]);
    feed = JSON.parse(JSON.stringify(feed));
    
    body.feed = feed;

    // Se obtienen los datos de las medicinas asociadas al lote
    let medicines = await pool.query('SELECT pm.productiveUnits_medicine_id AS id, pm.productiveUnits_medicine_name AS name, pm.productiveUnits_medicine_batch AS batch, bm.batches_medicines_quantity AS quantity, productiveUnits_medicine_price AS price FROM `batches_medicines` AS bm LEFT JOIN batches AS b ON b.batches_id = bm.batches_id LEFT JOIN productiveUnits_medicine AS pm ON pm.productiveUnits_medicine_id = bm.productiveUnits_medicine_id WHERE b.batches_token = ?;', [ token ]);
    feed = JSON.parse(JSON.stringify(feed));

    body.medicines = medicines;

    // Se obtienen los datos de los otros insumos asociados al lote
    let supply = await pool.query('SELECT ps.productiveUnits_supplies_id AS id, ps.productiveUnits_supplies_name AS name, bs.batches_supplies_quantity AS quantity FROM `batches_supplies` AS bs LEFT JOIN batches AS b ON b.batches_id = bs.batches_id LEFT JOIN productiveUnits_supplies AS ps ON ps.productiveUnits_supplies_id = bs.productiveUnits_supplies_id WHERE b.batches_token = ?;', [ token ]);
    supply = JSON.parse(JSON.stringify(supply));
    
    body.supply = supply;

    // Se obtienen los datos de los estanques asociados al lote
    let ponds = await pool.query('SELECT pp.productiveUnits_ponds_id AS id, pp.productiveUnits_ponds_name AS name FROM `batches_ponds` AS p LEFT JOIN batches AS b ON p.batches_id = b.batches_id LEFT JOIN productiveUnits_ponds AS pp ON pp.productiveUnits_ponds_id = p.productiveUnits_ponds_id WHERE b.batches_token = ?;', [ token ]);
    ponds = JSON.parse(JSON.stringify(ponds));
    
    body.ponds = ponds;

    // Se obtiene los registros de mortalidad
    let mortality = await pool.query('SELECT bm.batches_mortality_id AS id, bm.batches_mortality_dataDate AS date, bm.batches_mortality_quantity AS quantity, bm.batches_mortality_note AS note FROM `batches_mortality` as bm LEFT JOIN batches AS b ON b.batches_id = bm.batches_id WHERE b.batches_token = ?', [ token ]);
    mortality = JSON.parse(JSON.stringify(mortality));
    
    body.mortality = mortality;

    // Se evita sobreescritura de valor de biomasa en el body
    body.biomassValue = body.biomass;

    // Se obtienen los registros de biomasa
    let biomass = await pool.query('SELECT bb.batches_biomass_minSize AS minSize, bb.batches_biomass_maxSize AS maxSize, bb.batches_biomass_minWeight AS minWeight, bb.batches_biomass_maxWeight AS maxWeight, batches_biomass_value AS value, bb.batches_biomass_samples AS samples bb.batches_biomass_date AS date FROM `batches_biomass` AS bb LEFT JOIN batches AS b ON b.batches_id = bb.batches_id WHERE b.batches_token = ?', [ token ]);
    biomass = JSON.parse(JSON.stringify(biomass));

    body.biomass = biomass;

    // Se obtiene los datos del despacho
    let dispatches = body.dispatches ?? [];
    if (dispatches.length > 0) {
        for (let index = 0; index < dispatches.length; index++) {
            const element = dispatches[index];

            dispatches[index] = await dispatchData(element);
        }

        body.dispatches = dispatches;
    }

    return body;
}

// Constructor de trazabilidad para lote derivado de alevinera
async function derivedHatchery(body, prevToken) {
    // Se obtienen los datos del lote principal
    prevToken = JSON.parse(prevToken);

    let prevBatch = await pool.query('SELECT batches_body AS body FROM `batches` WHERE batches_token = ?', [ prevToken[0] ]);
    prevBatch = JSON.parse(JSON.stringify(prevBatch));

    bodyPrevBatch = JSON.parse(prevBatch[0].body);

    let mainBatch = await basicHatchery(bodyPrevBatch);

    // Se obtiene la especie del lote principal
    body.specie = mainBatch.specie;

    // Se obtiene la unidad del lote principal y se mezcla la cantidad
    body.quantityFish = body.quantityFish + " Alevinos";

    body.quantityFishIterator += " Alevinos";

    // Edad y unidad de edad del lote principal
    body.age = mainBatch.age;

    body.ageUnit = mainBatch.ageUnit;

    // Fecha de cosecha del lote principal
    body.harvestDate = mainBatch.harvestDate;

    // Padrotes usados en el lote
    body.broodstock = mainBatch.broodstock;

    // Piensos usados en el lote
    body.feed = mainBatch.feed;

    // Medicinas usados en el lote
    body.medicines = mainBatch.medicines;
    
    // Estanques usados en el lote
    body.ponds = mainBatch.ponds;

    // Se obtiene los datos del despacho
    let dispatches = body.dispatches ?? [];
    if (dispatches.length > 0) {
        for (let index = 0; index < dispatches.length; index++) {
            const element = dispatches[index];

            dispatches[index] = await dispatchData(element);
        }

        body.dispatches = dispatches;
    }

    body.prevBatches = [{token: prevToken[0]}];

    return body;
}

// Constructor de trazabilidad para lote mezclado de alevinera
async function mixedHatchery(body, prevToken) {
    // Se obtienen los tokens de los lotes principales
    prevToken = JSON.parse(prevToken);

    let specie = "";
    let broodstock = [];
    let feed = [];
    let ponds = [];
    let medicines = [];

    for (let index = 0; index < prevToken.length; index++) {
        element = prevToken[index];

        let prevBatch = await pool.query('SELECT batches_body AS body, batchesTypes_id AS type, batches_prevToken prev FROM `batches` WHERE batches_token = ?', [ element ]);
        prevBatch = JSON.parse(JSON.stringify(prevBatch));

        bodyPrevBatch = JSON.parse(prevBatch[0].body);


        let mainBatch;

        if (prevBatch[0].type == 1) {
            mainBatch = await basicHatchery(bodyPrevBatch);
        }else if(prevBatch[0].type == 2){
            mainBatch = await derivedHatchery(bodyPrevBatch, prevBatch[0].prev);
        }else{
            throw "Error con lote padre: "+element;
        }

        specie = mainBatch.specie;

        broodstock.push(mainBatch.broodstock);

        // Se agregan los piensos
        let feeds = mainBatch.feed ?? [];

        feeds.forEach(element => {
            feed.push(element)
        });

        // Se agregan los medicamentos
        let medicine = mainBatch.medicines ?? [];

        medicine.forEach(element => {
            medicines.push(element);
        });

        // Se agregan los estanques
        let pond = mainBatch.ponds ?? [];

        pond.forEach(element => {
            ponds.push(element);
        });

        prevToken[index] = {token: element, age: mainBatch.age, ageUnit: mainBatch.ageUnit, harvestDate: mainBatch.harvestDate}
    }

    // Se obtiene la especie del lote principal
    body.specie = specie;

    // Se obtiene la unidad del lote principal y se mezcla la cantidad
    body.quantityFish = body.finalQuantity + " Alevinos";

    body.quantityFishIterator += " Alevinos";

    // Padrotes usados en el lote
    body.broodstock = broodstock;

    // Piensos usados en el lote
    body.feed = feed;

    // Medicinas usados en el lote
    body.medicines = medicines;

    // Estanques usados en el lote
    body.ponds = ponds;

    // Se obtiene los datos del despacho
    let dispatches = body.dispatches ?? [];
    if (dispatches.length > 0) {
        for (let index = 0; index < dispatches.length; index++) {
            const element = dispatches[index];

            dispatches[index] = await dispatchData(element);
        }

        body.dispatches = dispatches;
    }

    body.mixed = undefined;

    body.prevBatches = prevToken;

    return body;
}

// Constructor de trazabilidad para lote basico de alevinera
async function basicFishFarming(token, body) {
    // Se agrega la palabra Individuos a la cantidad inicial de individuos
    body.quantityFish += " Individuos";

     // Se agrega la palabra Individuos a la cantidad actual de individuos
    body.quantityFishIterator += " Individuos";

    // Se agrega la medida kg a la cantidad inicial de individuos
    //body.weight += "kg";

    // Se agrega la medida kg a la cantidad actual de individuos
    //body.weightIterator += "kg";

    // Se agrega la medida kg a la cantidad inicial de individuos
    body.minimumSize += "cm";

    // Se agrega la medida kg a la cantidad actual de individuos
    body.maximumSize += "cm";

    // Se obtienen los datos de los piensos y se parsean si es que el lote los tiene
    // Se obtienen los datos de los piensos
    let feed = await pool.query('SELECT pf.productiveUnits_feed_name AS name, pf.productiveUnits_feed_batch AS batch, pf.productiveUnits_feed_id AS id, bf.batches_feed_quantity AS quantity, productiveUnits_feed_price AS price FROM `batches_feed` AS bf LEFT JOIN batches AS b ON b.batches_id = bf.batches_id LEFT JOIN productiveUnits_feed AS pf ON pf.productiveUnits_id = b.batches_productiveUnit WHERE b.batches_token = ?;', [ token ]);
    feed = JSON.parse(JSON.stringify(feed));
    
    body.feed = feed;

    // Se obtienen los datos de las medicinas asociadas al lote
    let medicines = await pool.query('SELECT pm.productiveUnits_medicine_id AS id, pm.productiveUnits_medicine_name AS name, pm.productiveUnits_medicine_batch AS batch, bm.batches_medicines_quantity AS quantity, productiveUnits_medicine_price AS price FROM `batches_medicines` AS bm LEFT JOIN batches AS b ON b.batches_id = bm.batches_id LEFT JOIN productiveUnits_medicine AS pm ON pm.productiveUnits_medicine_id = bm.productiveUnits_medicine_id WHERE b.batches_token = ?;', [ token ]);
    feed = JSON.parse(JSON.stringify(feed));

    body.medicines = medicines;

    // Se obtienen los datos de los otros insumos asociados al lote
    let supply = await pool.query('SELECT ps.productiveUnits_supplies_id AS id, ps.productiveUnits_supplies_name AS name, bs.batches_supplies_quantity AS quantity FROM `batches_supplies` AS bs LEFT JOIN batches AS b ON b.batches_id = bs.batches_id LEFT JOIN productiveUnits_supplies AS ps ON ps.productiveUnits_supplies_id = bs.productiveUnits_supplies_id WHERE b.batches_token = ?;', [ token ]);
    supply = JSON.parse(JSON.stringify(supply));
    
    body.supply = supply;

    // Se obtienen los datos de los estanques asociados al lote
    let ponds = await pool.query('SELECT pp.productiveUnits_ponds_id AS id, pp.productiveUnits_ponds_name AS name FROM `batches_ponds` AS p LEFT JOIN batches AS b ON p.batches_id = b.batches_id LEFT JOIN productiveUnits_ponds AS pp ON pp.productiveUnits_ponds_id = p.productiveUnits_ponds_id WHERE b.batches_token = ?;', [ token ]);
    ponds = JSON.parse(JSON.stringify(ponds));
    
    body.ponds = ponds;

    // Se obtiene los registros de mortalidad
    let mortality = await pool.query('SELECT bm.batches_mortality_id AS id, bm.batches_mortality_dataDate AS date, bm.batches_mortality_quantity AS quantity, bm.batches_mortality_note AS note FROM `batches_mortality` as bm LEFT JOIN batches AS b ON b.batches_id = bm.batches_id WHERE b.batches_token = ?', [ token ]);
    mortality = JSON.parse(JSON.stringify(mortality));
    
    body.mortality = mortality;

    // Se evita sobreescritura de valor de biomasa en el body
    body.biomassValue = body.biomass;
    
    // Se obtienen los registros de biomasa
    let biomass = await pool.query('SELECT bb.batches_biomass_minSize AS minSize, bb.batches_biomass_maxSize AS maxSize, bb.batches_biomass_minWeight AS minWeight, bb.batches_biomass_maxWeight AS maxWeight, batches_biomass_value AS value, bb.batches_biomass_date AS date FROM `batches_biomass` AS bb LEFT JOIN batches AS b ON b.batches_id = bb.batches_id WHERE b.batches_token = ?', [ token ]);
    biomass = JSON.parse(JSON.stringify(biomass));
    body.biomass = biomass;
    
    // Se obtiene los datos del despacho
    let dispatches = body.dispatches ?? [];
    if (dispatches.length > 0) {
        for (let index = 0; index < dispatches.length; index++) {
            const element = dispatches[index];

            dispatches[index] = await dispatchData(element);
        }

        body.dispatches = dispatches;
    }

    // Se obtiene los datos de los alevinos
    let fingerlings = body.fingerlings ?? [];
    if (fingerlings.length > 0) {
        for (let index = 0; index < fingerlings.length; index++) {
            const element = fingerlings[index];

            fingerlings[index] = await fingerlingsData(element);
        }

        body.fingerlings = fingerlings;
    }

    return body;
}

// Constructor de trazabilidad para lote derivado de engorde
async function derivedFishFarming(body, prevToken) {
    // Se obtienen los datos del lote principal
    prevToken = JSON.parse(prevToken);

    let prevBatch = await pool.query('SELECT batches_body AS body FROM `batches` WHERE batches_token = ?', [ prevToken[0] ]);
    prevBatch = JSON.parse(JSON.stringify(prevBatch));

    bodyPrevBatch = JSON.parse(prevBatch[0].body);

    let mainBatch = await basicFishFarming(bodyPrevBatch);

    // Se agrega la palabra Individuos a la cantidad inicial de individuos
    body.quantityFish = mainBatch.quantityFish;

     // Se agrega la palabra Individuos a la cantidad actual de individuos
    body.quantityFishIterator = mainBatch.quantityFishIterator;

    // Se agrega la medida kg a la cantidad inicial de individuos
    //body.weight += "kg";

    // Se agrega la medida kg a la cantidad actual de individuos
    //body.weightIterator += "kg";

    // Se agrega la medida kg a la cantidad inicial de individuos
    body.minimumSize = mainBatch.minimumSize;

    // Se agrega la medida kg a la cantidad actual de individuos
    body.maximumSize = mainBatch.maximumSize;

    // Piensos usados en el lote
    body.feed = mainBatch.feed;

    // Medicinas usados en el lote
    body.medicines = mainBatch.medicines;
    
    // Estanques usados en el lote
    body.ponds = mainBatch.ponds;

    // Alevinos usados en el lote
    body.fingerlings = mainBatch.fingerlings;

    // Se obtiene los datos del despacho
    let dispatches = body.dispatches ?? [];
    if (dispatches.length > 0) {
        for (let index = 0; index < dispatches.length; index++) {
            const element = dispatches[index];

            dispatches[index] = await dispatchData(element);
        }

        body.dispatches = dispatches;
    }

    body.prevBatches = [{token: prevToken[0]}];

    return body;
}

// Constructor de trazabilidad para lote derivado de alevinera
async function mixedFishFarming(body, prevToken) {
    // Se obtienen los tokens de los lotes principales
    prevToken = JSON.parse(prevToken);

    let feed = [];
    let ponds = [];
    let medicines = [];
    let fingerlings = []

    for (let index = 0; index < prevToken.length; index++) {
        element = prevToken[index];

        let prevBatch = await pool.query('SELECT batches_body AS body, batchesTypes_id AS type, batches_prevToken AS prevToken FROM `batches` WHERE batches_token = ?', [ element ]);
        prevBatch = JSON.parse(JSON.stringify(prevBatch));

        bodyPrevBatch = JSON.parse(prevBatch[0].body);

        if (prevBatch[0].type == 5) {
            let prevToken = JSON.parse(prevBatch[0].prevToken);

            let prevSubBatch = await pool.query('SELECT batches_body AS body, batchesTypes_id AS type, batches_prevToken AS prevToken FROM `batches` WHERE batches_token = ?', [ prevToken[0] ]);
            prevSubBatch = JSON.parse(JSON.stringify(prevSubBatch));

            bodyPrevBatch = JSON.parse(prevSubBatch[0].body);
        }

        let mainBatch = await basicFishFarming(bodyPrevBatch);

        // Se agregan los piensos
        let feeds = mainBatch.feed ?? [];

        feeds.forEach(element => {
            feed.push(element)
        });

        // Se agregan los estanques
        let pond = mainBatch.ponds ?? [];

        pond.forEach(element => {
            ponds.push(element);
        });

        // Se agregan los medicamentos
        let medicine = mainBatch.medicines ?? [];

        medicine.forEach(element => {
            medicines.push(element);
        });

        // Se agregan los alevinos
        let fingerling = mainBatch.fingerlings;

        fingerling.forEach(element => {
            fingerlings.push(element);
        });

        prevToken[index] = {token: element, harvestDate: mainBatch.harvestDate}
    }

    // Piensos usados en el lote
    body.feed = feed;

    // Medicinas usados en el lote
    body.medicines = medicines;

    // Estanques usados en el lote
    body.ponds = ponds;

    // Estanques usados en el lote
    body.fingerlings = fingerlings;

    // Se obtiene los datos del despacho
    let dispatches = body.dispatches ?? [];
    if (dispatches.length > 0) {
        for (let index = 0; index < dispatches.length; index++) {
            const element = dispatches[index];

            dispatches[index] = await dispatchData(element);
        }

        body.dispatches = dispatches;
    }

    body.mixed = undefined;

    body.prevBatches = prevToken;

    return body;
}

// Función para obtener nombre de una ciudad
async function getCountryName(id) {
    let country = await fetch(config.apisRoute+"/general/countries?id="+id,{
        method: "GET"
    }).then(async response => {
        if (response.ok) {
            return await response.json();
        } else {
            return {};
        }
    });

    return country.countries[0].countries_name;
}

// Función para obtener nombre de un tipo de documento
async function getDocumentTypeName(id) {
    let document = await fetch(config.apisRoute+"/general/documentTypes?flag="+id,{
        method: "GET"
    }).then(async response => {
        if (response.ok) {
            return await response.json();
        } else {
            return {};
        }
    });

    return document.documents[0].document_types_name;
}

module.exports = { validProductiveUnitType, getUserId, userOwnerProductiveUnit, productiveUnitActive, getUserHash, getUserAuth, constructTraceability, getCountryName, getDocumentTypeName }