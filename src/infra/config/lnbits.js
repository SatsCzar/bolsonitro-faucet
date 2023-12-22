require("dotenv").config()

module.exports = {
  baseUrl: process.env.LNBITS_BASE_URL,
  adminKey: process.env.LNBITS_ADMIN_KEY,
}
