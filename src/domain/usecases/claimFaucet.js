const { usecase, step, Ok, Err } = require("@herbsjs/herbs")
const { herbarium } = require("@herbsjs/herbarium")
const LightningClient = require("../../infra/clients/LightningClient")
const CashuClient = require("../../infra/clients/CashuClient")
const UserRepository = require("../../infra/database/repositories/UserRepository")
const config = require("../../infra/config")

const FAUCET_REWARD = config.faucet.faucetReward

const dependency = {
  LightningClient,
  CashuClient,
  UserRepository,
}

const claimFaucet = (injection) =>
  usecase("Generate a Cashu token for the user", {
    response: { token: String },

    authorize: (user) => (user ? Ok() : Err()),

    setup: (ctx) => {
      ctx.di = Object.assign({}, dependency, injection)
      ctx.di.cashuClientInstance = new ctx.di.CashuClient()
      ctx.di.lightningClientInstance = new ctx.di.LightningClient()
      ctx.di.userRepositoryInstance = new ctx.di.UserRepository()
      ctx.data = {}
    },

    "Checks if the user can claim the reward": step((ctx) => {
      const user = ctx.user

      const canClaim = user.canClaim()

      if (canClaim) return Ok()

      const diffHours = user.diffHours()

      const timeCanClaim = Math.abs(Math.round(diffHours - config.faucet.faucetIntervalHours))

      return Err(`You can't get the reward now, wait ${timeCanClaim} hours`)
    }),

    "Check if the wallet has enough satoshis": step(async (ctx) => {
      const { lightningClientInstance } = ctx.di

      const response = await lightningClientInstance.getWalletDetails()

      if (response.isErr)
        return Err.unknown({
          message: "Error while try to pay the invoice",
          cause: response.err,
        })

      const walletDetails = response.ok

      if (walletDetails.balance < FAUCET_REWARD) return Err("Bot does not have enough satoshis")

      return Ok()
    }),

    "Update the user": step(async (ctx) => {
      const { userRepositoryInstance } = ctx.di
      const user = ctx.user

      user.lastClaim = new Date()

      try {
        await userRepositoryInstance.update(user)

        return Ok()
      } catch (error) {
        return Err.unknown({
          message: "Error when trying to update user",
          cause: error,
        })
      }
    }),

    "Request mint": step(async (ctx) => {
      const { cashuClientInstance } = ctx.di

      const response = await cashuClientInstance.requestMint(FAUCET_REWARD)

      if (response.isErr)
        return Err.unknown({
          message: "Error while try to request mint",
          cause: response.err,
        })

      ctx.data.mintRequest = response.ok

      return Ok()
    }),

    "Pay the request mint": step(async (ctx) => {
      const { lightningClientInstance } = ctx.di
      const { mintRequest } = ctx.data

      const response = await lightningClientInstance.payInvoice(mintRequest.bolt11)

      if (response.isErr)
        return Err.unknown({
          message: "Error while try to pay the invoice",
          cause: response.err,
        })

      return Ok()
    }),

    "Generate Cashu token": step(async (ctx) => {
      const { mintRequest } = ctx.data
      const { cashuClientInstance } = ctx.di

      const response = await cashuClientInstance.generateCashuToken(FAUCET_REWARD, mintRequest.hash)

      if (response.isErr)
        return Err.unknown({
          message: "Error while try to pay to generate cashu token",
          cause: response.err,
        })

      ctx.ret = { token: response.ok }

      return Ok()
    }),
  })

module.exports = herbarium.usecases.add(claimFaucet, "ClaimFaucet").metadata({ group: "Faucet" }).usecase
