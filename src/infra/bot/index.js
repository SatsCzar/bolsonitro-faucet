const { Telegraf } = require("telegraf")
const commandParts = require("@satsczar/telegraf-command-parts")
const config = require("../config")
const createDepositIntent = require("../../domain/usecases/createDepositIntent")
const { checker } = require("@herbsjs/herbs")
const userMiddleware = require("./middlewares/userMiddleware")
const claimFaucet = require("../../domain/usecases/claimFaucet")

const runBot = () => {
  const bot = new Telegraf(config.token)

  bot.use(commandParts())
  bot.use(userMiddleware())

  bot.command("start", async (ctx) => {
    try {
      await ctx.reply("Hello, I'm a Robot")
    } catch (error) {
      console.log(error)
    }
  })

  bot.command("deposit", async (ctx) => {
    try {
      const amount = ctx.state.command.splitArgs[0]
      const chatId = ctx.message.chat.id

      if (checker.isEmpty(amount)) {
        await ctx.reply("Please enter the number of satoshis\nExample: /deposit 5000", {
          parse_mode: "Markdown",
        })
        return
      }

      const usecase = createDepositIntent()

      await usecase.authorize()

      const response = await usecase.run({ amount, chatId })

      if (response.isErr) {
        await ctx.reply(response.err.message || response.err)
        return
      }

      const { invoice } = response.ok

      await ctx.reply(invoice)
    } catch (error) {
      console.log(error)
    }
  })

  bot.command("claim", async (ctx) => {
    try {
      const usecase = claimFaucet()

      await usecase.authorize(ctx.state.user)

      const response = await usecase.run()

      if (response.isErr) {
        await ctx.reply(response.err.message || response.err)
        return
      }

      const { token } = response.ok

      await ctx.reply(token)
    } catch (error) {
      console.log(error)
    }
  })

  bot.launch()
  console.log("🤖 Bot Working \n")

  return bot
}

module.exports = runBot
