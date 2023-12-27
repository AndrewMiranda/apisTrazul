/**
 * Datos para realizar la conexion a la BD
 */

module.exports = {
    database: {
        host:  process.env.HOST || '191.101.233.119',
        user: process.env.USER || 'redazul',
        password: process.env.PASSWORD || 'OKJEQFPS3MGrnCf',
        database: process.env.DBNAME || 'trazul'
    }
};