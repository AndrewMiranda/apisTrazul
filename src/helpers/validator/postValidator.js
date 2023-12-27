// Importar las funciones de validación
const functions = require('./validatorFunctions');

async function validate(config, type, value, required) {
    if (required == true || value != undefined) {
        // Verificar si la función existe en el objeto importado
        if (functions[type] && typeof functions[type] === "function") {
            // Ejecutar la función
            return await functions[type](value, config);
        } else {
            throw "La función " + type + " no existe.";
        }
    } else {
        return value;
    }
}

module.exports = validate;