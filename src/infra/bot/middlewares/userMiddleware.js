const { Composer } = require("telegraf")
const createUserIfNotExists = require("../../../domain/usecases/createUserIfNotExists")
const User = require("../../../domain/entities/User")

/* eslint no-param-reassign: ["error", { "props": false }] */
module.exports = () =>
  Composer.on("text", async (ctx, next) => {
    const userRequest = User.fromTelegram(ctx.update.message.from)

    const ucInstance = createUserIfNotExists()

    await ucInstance.authorize()

    const ucResponse = await ucInstance.run(userRequest)

    if (ucResponse.isErr) {
      console.log(ucResponse.err)

      throw new Error("An error occurred while verifying the user")
    }

    ctx.state.user = ucResponse.ok

    return next()
  })
