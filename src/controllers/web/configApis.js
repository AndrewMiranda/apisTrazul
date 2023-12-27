// CONFIGURACIÓN DE RUTA Y PUERTO DE API's

const appPort = process.env.PORT || 3000;
let apisRouteConstruct = process.env.URLAPI || 'http://localhost:'+appPort;
apisRouteConstruct += "/apis/";
const apisRoute = apisRouteConstruct;

module.exports = {appPort, apisRoute};