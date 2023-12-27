// Librerias
const sharp = require('sharp');
const fs = require('fs');
const { genRandomString } = require('../randomString');
const { default: fetch } = require('node-fetch');

function text(value) {
    return value;
}

function email(value) {
    var regExp = /\S+@\S+\.\S+/;
    if (regExp.test(value)) {
        return value;
    } else {
        throw `El email '${value}' no es válido`;
    }
}

function phone(value) {
    // Se parsea el texto a número
    value = parseInt(value);

    if (typeof value === 'number' && !isNaN(value)) {
        if (value.toString().length === 10) {
            return value;
        } else {
            throw `El telefono '${value}' no es válido`;
        }
    } else {
        throw `El telefono '${value}' no es válido`;
    }
}

function int(value) {
    // Se parsea el texto a número
    value = parseInt(value);

    if (typeof value === 'number' && !isNaN(value)) {
        return value;
    } else {
        throw `'${value}' no es válido`;
    }
}

function url(value) {
    // Expresión regular para verificar si es una URL
    const regex = /^(ftp|http|https):\/\/[^ "]+$/;
    const secondRegex = /(http|https)/;

    if (regex.test(value)) {
        return value;
    } else if(!secondRegex.test(value)){
        return "http://"+value;
    }else {
        throw `La URL '${value}' no es válida`;
    }
}

async function municipality(value, config) {
    // Se parsea el texto a número
    value = parseInt(value);

    let city;

    if (typeof value === 'number' && !isNaN(value)) {
        await fetch(config.apisRouteRedAzul+'/general/cities?id='+value, {
            method: 'GET',
            headers: {
                'Authorization': config.authRedAzul
            }
        })
        .then(async response =>  {
            if (response.status === 200) {
                data = await response.json();
                city = data.cities;
            }else{
                throw `Error al validar municipio`;
            }
        })
        .catch(err => {
            console.log(err);
            throw `Municipio '${value}' no es válido`;
        });

        if (city.length > 0) {
            return value;
        } else {
            throw `Municipio '${value}' no existe`;
        }
    } else {
        throw `Municipio '${value}' no es válido`;
    }
}

async function image(value, config) {
    // Conexión a BD 
    const pool = require("../../config/dbConnections"+config.DBName);

    // Ruta dónde guardar la imagen
    let folder = "./src/public/content/images/";

    try {
        let types = await pool.query('SELECT JSON_EXTRACT(multimedia_types_body, "$.types") AS types     FROM `multimedia_types` WHERE multimedia_types_name = "image";');
        types = JSON.parse(JSON.stringify(types));

        types = types[0].types;
        types = JSON.parse(types);  

        valid = false;

        types.forEach(element => {
            if ("image/"+element == value.mimetype) {
                valid = true
            }
        });

        if (valid == true) {
            let imageName = genRandomString(12)+".jpeg";

            await sharp(value.data).jpeg({ mozjpeg: true }).toFile(folder+imageName);

            await pool.query('INSERT INTO `multimedia`(`multimedia_types_id`, `multimedia_url`) VALUES (?, ?)', [1, imageName]);
    
            return imageName;
        } else {
            throw "Formato de imagen no válido, solo se admite png, jpg y jpeg"
        }
    } catch (error) {
        console.log(error);
        throw error;
    }
}

function coords(value) {
    // Verificar si se proporcionó un valor
    if (!value) {
        throw `Las coordenadas son obligatorias`;
    }

    // Dividir las coordenadas en latitud y longitud
    const coordenadasArray = value.split(',');

    // Verificar si se obtuvieron dos valores
    if (coordenadasArray.length !== 2) {
        throw `Las coordenadas ${value} no son validas`;
    }

    // Convertir a números
    const latitudNum = parseFloat(coordenadasArray[0]);
    const longitudNum = parseFloat(coordenadasArray[1]);

    // Verificar si las conversiones fueron exitosas
    if (isNaN(latitudNum) || isNaN(longitudNum)) {
        throw `Las coordenadas ${value} no son validas`;
    }

    // Verificar rangos válidos para latitud y longitud
    if (latitudNum < -90 || latitudNum > 90 || longitudNum < -180 || longitudNum > 180) {
        throw `Las coordenadas ${value} no son validas`;
    }

    // Si todas las verificaciones pasan, las coordenadas son válidas
    return coordenadasArray;
}

function array(value) {
    value = JSON.parse(value)
    if (Array.isArray(value)) {
        return value;
    } else {
        throw `'${value}' no es válido`;
    }
}

function file(value) {
    // Se parsea el texto a número
    value = parseInt(value);

    if (typeof value === 'number' && !isNaN(value)) {
        return true;
    } else {
        throw `El telefono '${value}' no es válido`;
    }
}

function multipleFile(value) {
    // Se parsea el texto a número
    value = parseInt(value);

    if (typeof value === 'number' && !isNaN(value)) {
        return true;
    } else {
        throw `El telefono '${value}' no es válido`;
    }
}

module.exports = {text, email, phone, int, url, image, municipality, coords, array}