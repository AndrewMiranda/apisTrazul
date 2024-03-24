// COMMONS DE GENERAL

// Configuración de las API's
const config = require("../configApis");

// Función para comparar el numero de versión de la app
function compareVersions(version1, version2) {
    const parts1 = version1.split('.').map(Number);
    const parts2 = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;

        if (part1 > part2) {
            return 1; // version1 es mayor
        } else if (part1 < part2) {
            return -1; // version2 es mayor
        }
    }

    return 0; // son iguales
}

// Función para comparar el numero de versión de la app
function verifyApk(file) {
    const name = file.name;
    const mimetype = file.mimetype;

    // Se verifica si el mimetpy es válido
    if (mimetype != "application/octet-stream") {
        return false;
    }else{
        // Se verifica si la extensión concuerda con una apk
        let fileExtension = name.split('.').pop().toLowerCase();
        
        if (fileExtension !== 'apk') {
            return false
        }else{
            return true
        }
    }
}

module.exports = { compareVersions, verifyApk }