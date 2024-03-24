// Librerías de IP

function getUserIp(req) {
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    return clientIp;
}

module.exports = {getUserIp}