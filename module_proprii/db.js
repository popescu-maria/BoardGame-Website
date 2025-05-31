const { Client } = require('pg');
const client = new Client({
    database:"proiect",
    user:"maria",
    password:"maria",
    host:"localhost",
    port:5432
});
client.connect();
module.exports = client;