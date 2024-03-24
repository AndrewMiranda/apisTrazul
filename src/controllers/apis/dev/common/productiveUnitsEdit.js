// COMMONS DE UNIDADES PRODUCTIVAS

// Configuración de las API's
const config = require("../configApis");

// Libs
const pool = require("../../../../config/dbConnections"+config.DBName);
const {getUserId, getUserHash, getUserAuth} = require("./users");


async function validProductiveUnitType(productiveUnit, typeProductiveUnit) {
    let validType = await pool.query('SELECT * FROM `productiveUnits` WHERE productiveUnits_id = ? AND productiveUnits_types_id = ?', [ productiveUnit, typeProductiveUnit ]);
    validType = JSON.parse(JSON.stringify(validType));

    if (validType.length > 0) {
        return true;
    }else{
        return false;
    }
}



async function userOwnerProductiveUnit(productiveUnit, userId) {
    let owner = await pool.query('SELECT * FROM `productiveUnits` WHERE users_id = ? AND productiveUnits_id = ?', [ userId, productiveUnit ]);
    owner = JSON.parse(JSON.stringify(owner));

    if (owner.length > 0) {
        return true;
    }else{
        return false;
    }
}

async function productiveUnitActive(productiveUnit) {
    let active = await pool.query('SELECT * FROM `productiveUnits` WHERE productiveUnits_id = ? AND productiveUnits_state = 1', [ productiveUnit ]);
    active = JSON.parse(JSON.stringify(active));

    if (active.length > 0) {
        return true;
    }else{
        return false;
    }
}

module.exports = { validProductiveUnitType, getUserId, userOwnerProductiveUnit, productiveUnitActive, getUserHash, getUserAuth }