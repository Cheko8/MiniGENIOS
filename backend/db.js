require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT 1')
  .then(() => console.log('Conectado a Postgres'))
  .catch((e) => console.error('Error conectando a Postgres:', e.message));

module.exports = pool;