// db.js
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',          // 🔁 use your MySQL username
  password: '',  // 🔁 replace with your MySQL password
  database: 'tau'        // 🔁 or whatever your database is
});

module.exports = db;
