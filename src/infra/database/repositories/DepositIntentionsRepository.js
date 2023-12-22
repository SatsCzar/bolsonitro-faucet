const { Repository } = require("@herbsjs/herbs2mongo")
const { herbarium } = require("@herbsjs/herbarium")
const DepositIntent = require("../../../domain/entities/DepositIntent")
const connection = require("../connection")
const depositStatusEnum = require("../../../domain/enums/depositStatusEnum")

class DepositIntentionsRepository extends Repository {
  constructor() {
    super({
      entity: DepositIntent,
      collection: "deposit_intentions",
      mongodb: connection,
      ids: ["id"],
    })
  }

  findAllPending() {
    return this.find({
      filter: {
        status: depositStatusEnum.pending,
      },
    })
  }
}

module.exports = herbarium.repositories
  .add(DepositIntentionsRepository, "DepositIntentionsRepository")
  .metadata({ entity: DepositIntent }).repository
