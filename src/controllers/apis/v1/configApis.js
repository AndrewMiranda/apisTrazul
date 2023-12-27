// CONFIGURACIÓN DE RUTA Y PUERTO DE API's

const appPort = process.env.PORT || 3001;
let apisRouteConstruct = process.env.URLAPI || 'http://localhost:'+appPort;
apisRouteConstruct += "/apis/";
const apisRoute = apisRouteConstruct;

const isDevConfig = false;

if (isDevConfig == true) {
    DBName = "dev"; 
}else{
    DBName = ""; 
}


module.exports = {appPort, apisRoute, DBName};