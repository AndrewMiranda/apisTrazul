const mysql = require('mysql');
const { promisify }= require('util');

const { database } = require('./keys');

const pool = mysql.createPool(database);

// Env
const envDeploy = process.env.NODE_ENV || "dev";

pool.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has to many connections');
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused');
        }
    }

    if (connection) connection.release();

    // Lanza el mensaje si se ejecuta en producción y desarrollo pero no en test
    if (envDeploy == "dev" || envDeploy == "production") {
        console.log('DB Prod is Connected');
    }

    return;
});

// Promisify Pool Querys
pool.query = promisify(pool.query);

module.exports = pool;