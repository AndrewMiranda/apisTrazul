// COMMONS DE LOTES

// Configuración de las API's
const config = require("../configApis");

// Libs
const pool = require("../../../../config/dbConnections"+config.DBName);
const fetch = require('node-fetch');
const { validProductiveUnitType, getUserId, userOwnerProductiveUnit, productiveUnitActive, getUserHash, getUserAuth } = require("./productiveUnitsEdit");
const { spececieName, formatDate, ageUnit, broodstockData, feedData, medicineData, pondData, dispatchData, fingerlingsData } = require("./batchesAux");

// Función para construir objeto con información de trazabilidad según el tipo de lote
async function constructTraceability(token, type, body, prevToken) {
    // Se parsea el body del lote
    body = JSON.parse(body);

    // Se invoca a la función constructora dependiendo del tipo de lote
    switch (type) {
        case 1:
            body = await basicHatchery(body);
            break;

        case 2:
            body = await derivedHatchery(body, prevToken);
            break;

        case 3:
            body = await mixedHatchery(body, prevToken);
            break;

        case 4:
            body = await basicFishFarming(body);
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
async function basicHatchery(body) {
    // Se eliminan los datos innecesarios
    body.productiveUnitId = undefined;

    // Se consulta el nombre de la especie
    body.specie = await spececieName(body.specie);

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

    // Se obtienen los datos de los piensos y se parsean si es que el lote los tiene
    let feed = body.feed ?? [];
    if (feed.length > 0) {
        for (let index = 0; index < feed.length; index++) {
            const element = feed[index];
            
            feed[index] = await feedData(element[0], element[1]);
        }
    
        body.feed = feed;
    }

    // Se obtienen los datos de las medicinas y se parsean si es que el lote las tiene
    let medicines = body.medicines ?? [];
    if (medicines.length > 0) {
        for (let index = 0; index < medicines.length; index++) {
            const element = medicines[index];
            
            medicines[index] = await medicineData(element);
        }
    
        body.medicines = medicines;
    }

    // Se obtienen los datos de los estanques y se parsean si es que el lote los tiene
    let ponds = body.ponds ?? [];
    if (ponds.length > 0) {
        for (let index = 0; index < ponds.length; index++) {
            const element = ponds[index];
            
            ponds[index] = await pondData(element);
        }
    
        body.ponds = ponds;
    }
    
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
async function basicFishFarming(body) {
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
    let feed = body.feed ?? [];
    if (feed.length > 0) {
        for (let index = 0; index < feed.length; index++) {
            const element = feed[index];
            
            feed[index] = await feedData(element[0], element[1]);
        }
    
        body.feed = feed;
    }

    // Se obtienen los datos de las medicinas y se parsean si es que el lote las tiene
    let medicines = body.medicines ?? [];
    if (medicines.length > 0) {
        for (let index = 0; index < medicines.length; index++) {
            const element = medicines[index];
            
            medicines[index] = await medicineData(element);
        }
    
        body.medicines = medicines;
    }

    // Se obtienen los datos de los estanques y se parsean si es que el lote los tiene
    let ponds = body.ponds ?? [];
    if (ponds.length > 0) {
        for (let index = 0; index < ponds.length; index++) {
            const element = ponds[index];
            
            ponds[index] = await pondData(element);
        }
    
        body.ponds = ponds;
    }
    
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