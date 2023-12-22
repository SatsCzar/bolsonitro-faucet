const { usecase, step, Ok, checker, Err } = require("@herbsjs/herbs")
const { herbarium } = require("@herbsjs/herbarium")
const LightningClient = require("../../infra/clients/LightningClient")
const DepositIntentionsRepository = require("../../infra/database/repositories/DepositIntentionsRepository")
const depositStatusEnum = require("../enums/depositStatusEnum")
const lightningPayReq = require("bolt11")

const dependency = {
  LightningClient,
  DepositIntentionsRepository,
}

const checkDepositIntentions = (injection) =>
  usecase("Check deposit intentions", {
    request: {},

    response: {},

    authorize: () => Ok(),

    setup: (ctx) => {
      ctx.di = Object.assign({}, dependency, injection)
      ctx.di.depositIntentionsInstance = new ctx.di.DepositIntentionsRepository()
      ctx.di.lightningClientInstance = new ctx.di.LightningClient()
      ctx.data = {
        currentDate: ctx.di.currentDate || new Date(),
      }
    },

    "Find all pending deposit intentions": step(async (ctx) => {
      const { depositIntentionsInstance } = ctx.di

      const depositIntentionsPending = await depositIntentionsInstance.findAllPending()

      if (checker.isEmpty(depositIntentionsPending)) return Ok(ctx.stop())

      ctx.data.intentionsPending = depositIntentionsPending

      return Ok()
    }),

    "Get all payments in Lightning Network": step(async (ctx) => {
      const { lightningClientInstance } = ctx.di

      const paymentsReceived = await lightningClientInstance.getAllPayments()

      if (paymentsReceived.isErr) return Err(paymentsReceived.err)

      ctx.data.paymentsReceived = paymentsReceived.ok

      return Ok()
    }),

    "Check intentions paid and credit the amount in user account": step({
      "Check the intentions that were paid": step((ctx) => {
        const { intentionsPending, paymentsReceived } = ctx.data

        const intentionsPaid = intentionsPending
          .map((intention) => {
            const intentionWerePaid = ({ payment_hash, pending }) =>
              payment_hash == intention.invoiceId && pending == false

            const werePaid = paymentsReceived.some(intentionWerePaid)

            if (werePaid) return intention
          })
          .filter(Boolean)

        ctx.data.intentionsPaid = intentionsPaid

        return Ok()
      }),

      "Changes the status of intents that have been paid": step(async (ctx) => {
        const { intentionsPaid } = ctx.data
        const { depositIntentionsInstance } = ctx.di

        const intentionsCredited = []

        const intentionsToUpdate = intentionsPaid.map((intention) => {
          intention.status = depositStatusEnum.credited

          return intention
        })

        for (const intention of intentionsToUpdate) {
          try {
            const updated = await depositIntentionsInstance.update(intention)

            intentionsCredited.push(updated)
          } catch (error) {
            console.log(error)
          }
        }

        ctx.data.intentionsCredited = intentionsCredited

        return Ok()
      }),

      "Notifies users that the deposit has been credited": step(async (ctx) => {
        const { bot } = ctx.di
        const { intentionsCredited } = ctx.data

        for (const intention of intentionsCredited) {
          try {
            const message = `Your deposit of ${intention.amount} has been credited`

            await bot.telegram.sendMessage(intention.chatId, message)
          } catch (error) {
            console.log(`Error while try to send message to user ${intention.chatId}: ${error.message}`)
          }
        }
        return Ok()
      }),
    }),

    "Check the intentions that were expired": step((ctx) => {
      const { intentionsPending, currentDate } = ctx.data

      const intentionsExpired = intentionsPending
        .map((intention) => {
          const decodedBolt11 = lightningPayReq.decode(intention.bolt11)

          const wereExpired = new Date(decodedBolt11.timeExpireDateString) < currentDate

          if (wereExpired) return intention
        })
        .filter(Boolean)

      ctx.data.intentionsExpired = intentionsExpired

      return Ok()
    }),

    "Changes the status of intents that have been expired": step(async (ctx) => {
      const { intentionsExpired } = ctx.data
      const { depositIntentionsInstance } = ctx.di

      for (const intention of intentionsExpired) {
        try {
          intention.status = depositStatusEnum.expired

          await depositIntentionsInstance.update(intention)
        } catch (error) {
          console.log(error)
        }
      }

      return Ok()
    }),
  })

module.exports = herbarium.usecases
  .add(checkDepositIntentions, "checkDepositIntentions")
  .metadata({ group: "Balance" }).usecase
