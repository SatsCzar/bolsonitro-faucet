const { Repository } = require("@herbsjs/herbs2mongo")
const { herbarium } = require("@herbsjs/herbarium")
const connection = require("../connection")
const User = require("../../../domain/entities/User")

class UsersRepository extends Repository {
  constructor() {
    super({
      entity: User,
      collection: "users",
      mongodb: connection,
      ids: ["id"],
    })
  }
}

module.exports = herbarium.repositories.add(UsersRepository, "UsersRepository").metadata({ entity: User }).repository
