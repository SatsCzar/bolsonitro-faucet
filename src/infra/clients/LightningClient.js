const { Ok, Err } = require("@herbsjs/herbs")
const config = require("../config")
const axios = require("axios")

const dependency = {
  axios,
}

class LightningClient {
  constructor(injection) {
    this._di = Object.assign({}, dependency, injection)

    /**
     * Instância do Axios configurada para comunicação com a API.
     * @type {import('axios').AxiosInstance}
     */
    this._axios = this._di.axios.create({
      baseURL: config.lnbits.baseUrl,
      headers: {
        "X-Api-Key": config.lnbits.adminKey,
      },
    })
  }

  async getWalletDetails() {
    try {
      const { data } = await this._axios.get("/wallet")

      return Ok(data)
    } catch (error) {
      return Err(error.message)
    }
  }

  async generateInvoice(amount) {
    try {
      const { data } = await this._axios.post("/payments", {
        out: false,
        amount,
      })

      return Ok({ invoice: data.payment_request, id: data.payment_hash })
    } catch (error) {
      return Err(error.message)
    }
  }

  async checkInvoice(invoiceId) {
    try {
      const { data } = await this._axios.get(`/payments/${invoiceId}`)

      return Ok({ id: invoiceId, is_confirmed: data.paid })
    } catch (error) {
      return Err(error.message)
    }
  }

  async getAllPayments() {
    try {
      const { data } = await this._axios.get("/payments")

      return Ok(data)
    } catch (error) {
      return Err(error.message)
    }
  }

  async payInvoice(bolt11) {
    try {
      await this._axios.post("/payments", {
        out: true,
        bolt11,
      })

      return Ok()
    } catch (error) {
      return Err(error.message)
    }
  }
}

module.exports = LightningClient
