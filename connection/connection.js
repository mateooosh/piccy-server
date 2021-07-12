const mysql = require('mysql');
const config = require('../config/databaseConfig')

const connection = mysql.createConnection(config.config);

connection.connect();

module.exports.connection = connection;
