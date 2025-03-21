// COMMONS AUXILIARES DE LOTES

// Configuración de las API's
const config = require("../configApis");

// Libs
const pool = require("../../../../config/dbConnections"+config.DBName);
const fetch = require('node-fetch');

// Función para formatear fecha según el formato del FrontEnd
async function specieName(id) {
    // Fetch para obtener los datos de la especie
    specie = await fetch(config.apisRoute+"/general/species?flag="+id, {
        method: "GET"
    }).then(async response => {
        if (response.ok) {
            return await response.json();
        } else {
            throw "Error al consultar la especie";
        }
    })
    
    // Se retorna el nombre vulgar de la especie
    return specie.speciesTypes[0].vulgarName;
}

// Función para obtener el nombre de una especie con el ID
function formatDate(dateText) {
    const date = new Date(dateText);

    // Obtener el día, el mes y el año
    const day = date.getDate();
    const month = date.toLocaleString('es-ES', { month: 'long' });
    const year = date.getFullYear();

    // Formatear la fecha
    return `${day}/${month}/${year}`;
}

// Función para obtener el nombre de la unidad de edad
async function ageUnit(age, id) {
    // Se consulta el tipo de unidad de edad
    let unitAge = await pool.query('SELECT ageUnits_singularName AS singular, ageUnits_pluralName AS plural FROM `ageUnits` WHERE ageUnits_id = ?', [ id ]);
    unitAge = JSON.parse(JSON.stringify(unitAge));

    if (age == 1) {
        return unitAge[0].singular;
    } else {
        return unitAge[0].plural;
    }
}

// Función para consultar datos de un padrote
async function broodstockData(id){
    // Se extraen los datos del padrote
    let broodstock = await pool.query('SELECT productiveUnits_broodstock_id AS id, productiveUnits_broodstock_body AS body FROM `productiveUnits_broodstock`WHERE productiveUnits_broodstock_id = ?', [ id ]);
    broodstock = JSON.parse(JSON.stringify(broodstock));

    // Datos del padrote
    let broodstockData = JSON.parse(broodstock[0].body);

    return [ broodstock[0].id, broodstockData.referenceCode ];
}

// Función para consultar datos de un pienso
async function feedData(id, quantity){
    feedData = await pool.query('SELECT productiveUnits_feed_name AS name, productiveUnits_feed_batch AS batch FROM `productiveUnits_feed` WHERE productiveUnits_feed_id = ?', [ id ]);
    feedData = JSON.parse(JSON.stringify(feedData));

    feedData[0].id = id;
    feedData[0].quantity = quantity;


    return feedData[0];
}

// Función para consultar datos de medicamento
async function medicineData(id){
    medicineData = await pool.query('SELECT productiveUnits_medicine_name AS name, productiveUnits_medicine_batch AS batch FROM `productiveUnits_medicine` WHERE productiveUnits_medicine_id = ?', [ id ]);
    medicineData = JSON.parse(JSON.stringify(medicineData));

    medicineData[0].id = id;

    return medicineData[0];
}

// Función para consultar datos de un estanque
async function pondData(id){
    pondData = await pool.query('SELECT productiveUnits_ponds_name AS name FROM `productiveUnits_ponds` WHERE productiveUnits_ponds_id = ?', [ id[0] ]);
    pondData = JSON.parse(JSON.stringify(pondData));

    pondData[0].id = id;

    return pondData[0];
}

// Función para consultar datos de un despacho
async function dispatchData(id){
    dispatchData = await pool.query('SELECT dispatch_id AS id, dispatch_token AS tokenDispatch, JSON_EXTRACT(dispatch_body, "$.client.name") AS name FROM `dispatch` WHERE dispatch_id = ?', [ id ]);
    dispatchData = JSON.parse(JSON.stringify(dispatchData));

    return dispatchData[0];
}

// Función para consultar datos de un alevino
async function fingerlingsData(id){
dispatchData = await pool.query('SELECT specie_id AS specie, JSON_EXTRACT(productiveUnits_fingerlings_body, "$.harvestDate") AS date, JSON_EXTRACT(productiveUnits_fingerlings_body, "$.price") AS price,  batches_token AS token, productiveUnits_fingerlings_id AS id FROM `productiveUnits_fingerlings` WHERE productiveUnits_fingerlings_id = ?', [ id ]);
    dispatchData = JSON.parse(JSON.stringify(dispatchData));

    dispatchData[0].specie = await specieName(dispatchData[0].specie);

    return dispatchData[0];
}


module.exports = { specieName, formatDate, ageUnit, broodstockData, feedData, medicineData, pondData, dispatchData, fingerlingsData }