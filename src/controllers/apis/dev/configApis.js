// CONFIGURACIÓN DE RUTA Y PUERTO DE API's

const appPort = process.env.PORT || 3001;
let apisRouteConstruct = process.env.URLAPI || 'http://localhost:'+appPort;
apisRouteConstruct += "/apis";

const urlWeb = process.env.URLWEB || 'http://localhost:'+appPort;

// Código RedAzul
const authRedAzul = "pub_2faf2c9769ca1c5e7db0557a5de5108e2593f05b759a566068cf4667cee63f45";

const isDevConfig = true;

if (isDevConfig == true) {
    // Ruta de API's Red Azul
    constructApisRouteRedAzul = process.env.URLAPIREDAZUL || 'http://localhost:3000/apis';

    constructApisRouteRedAzul+= "/dev";
    apisRouteConstruct+= "/dev";

    // Nombre de BD
    DBName = "Dev";

    // DB sql name
    DBSqlName = "dev"
}else{
    // Ruta de API's Red Azul
    constructApisRouteRedAzul = process.env.URLAPIREDAZUL || 'http://localhost:3000/apis';

    constructApisRouteRedAzul+= "/v1";
    apisRouteConstruct+= "/v1";

    // Nombre de BD
    DBName = ""; 

    // DB sql name
    DBSqlName = "dev"
}

// Definición de rutas de API's
const apisRouteRedAzul = constructApisRouteRedAzul;
const apisRoute = apisRouteConstruct;

const trazulKey = "6229aa5938617a240792ef1c4359779d";

module.exports = {appPort, apisRoute, DBName, authRedAzul, apisRouteRedAzul, trazulKey, DBSqlName, urlWeb};