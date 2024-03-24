// Librerías
const crypto = require('crypto');

function padNumber(num) {
    return num.toString().padStart(2, '0');
}

function generaterRandomSerial(length) {
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var charLength = chars.length;
    var result = '';

    // Se genera la cadena aleatoria
    for (var i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * charLength));
    }

    // Se obtiene la fecha y hora actual
    var currentDate = new Date();
    var day = currentDate.getDate();
    var month = currentDate.getMonth() + 1; // Los meses se cuentan desde 0
    var year = currentDate.getFullYear();
    var hours = currentDate.getHours();
    var minutes = currentDate.getMinutes();
    var seconds = currentDate.getSeconds();
    var milliseconds = currentDate.getMilliseconds();

    // Se ajusta los microsegundos manualmente (multiplicando por 1000)
    var microseconds = milliseconds * 1000;

    // Se agrega la información de fecha y hora a la cadena
    result += year.toString().slice(-2) + padNumber(month) + padNumber(day) + padNumber(hours) + padNumber(minutes) + padNumber(seconds) + padNumber(microseconds);

    return result;
}

module.exports = {generaterRandomSerial};