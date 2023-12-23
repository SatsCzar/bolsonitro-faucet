const { Ok, Err } = require("@herbsjs/herbs")
const config = require("../config")
const axios = require("axios")
const { CashuMint, CashuWallet, getEncodedToken } = require("@cashu/cashu-ts")

const dependency = {
  axios,
  CashuWallet,
}

class CashuClient {
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

    /**
     * Cashu Wallet
     * @type {import('@cashu/cashu-ts').CashuWallet}
     */
    this.wallet = new this._di.CashuWallet(new CashuMint(config.cashu.mintUrl))
  }

  async requestMint(amount) {
    try {
      const { pr, hash } = await this.wallet.requestMint(amount)

      return Ok({
        bolt11: pr,
        hash,
      })
    } catch (error) {
      return Err(error.message)
    }
  }

  async generateCashuToken(amount, hash) {
    try {
      const { proofs } = await this.wallet.requestTokens(amount, hash)

      const encoded = getEncodedToken({
        token: [{ mint: config.cashu.mintUrl, proofs }],
      })

      return Ok(encoded)
    } catch (error) {
      return Err(error.message)
    }
  }
}

module.exports = CashuClient
