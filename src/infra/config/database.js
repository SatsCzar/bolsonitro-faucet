require("dotenv").config()

module.exports = {
  connectionString: process.env.CONNECTION_STRING,
  dbName: process.env.DATABASE_NAME,
}
