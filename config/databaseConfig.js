require('dotenv').config()

const config  = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  charset : "utf8mb4"
}

module.exports.config = config;