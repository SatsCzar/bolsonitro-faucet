const { usecase, step, Ok, Err, checker, request, ifElse } = require("@herbsjs/herbs")
const { herbarium } = require("@herbsjs/herbarium")
const LightningClient = require("../../infra/clients/LightningClient")
const UserRepository = require("../../infra/database/repositories/UserRepository")
const User = require("../entities/User")

const dependency = {
  LightningClient,
  UserRepository,
}

const createUserIfNotExists = (injection) =>
  usecase("Create deposit intent", {
    request: request.from(User, { ignoreIds: true }),

    response: User,

    authorize: () => Ok(),

    setup: (ctx) => {
      ctx.di = Object.assign({}, dependency, injection)
      ctx.di.userRepositoryInstance = new ctx.di.UserRepository()
      ctx.data = {}
    },

    "Find the user in the database": step(async (ctx) => {
      const user = ctx.req
      const { userRepositoryInstance } = ctx.di

      const userFromDB = await userRepositoryInstance.find({
        filter: {
          chat_id: user.chatId,
        },
      })

      ctx.data.userFromDB = userFromDB?.[0]

      return Ok()
    }),

    "Checks if the user is registered, and registers if not.": ifElse({
      "Is the user registered?": step((ctx) => Ok(!checker.isEmpty(ctx.data.userFromDB))),

      "Then: Returns the user": step((ctx) => Ok((ctx.ret = ctx.data.userFromDB))),

      "Else: Register the user": step(async (ctx) => {
        const user = ctx.req
        const { userRepositoryInstance } = ctx.di

        try {
          await userRepositoryInstance.insert(user)

          return Ok()
        } catch (error) {
          return Err.unknown({
            message: "Unknown error when trying to register user",
            payload: { user },
            cause: error.message,
          })
        }
      }),
    }),
  })

module.exports = herbarium.usecases
  .add(createUserIfNotExists, "CreateUserIfNotExists")
  .metadata({ group: "User" }).usecase
