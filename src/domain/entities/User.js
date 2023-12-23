const { entity, field, id } = require("@herbsjs/herbs")
const { herbarium } = require("@herbsjs/herbarium")
const config = require("../../infra/config")

const User = entity("User", {
  id: id(String),
  username: field(String),
  chatId: field(Number, { validation: { presence: true } }),
  language: field(String),
  lastClaim: field(Date),

  diffHours() {
    const diff = new Date() - this.lastClaim

    const diffHours = diff / 3600000

    return diffHours
  },

  canClaim() {
    if (this.lastClaim instanceof Date) {
      const canClaim = this.diffHours() > config.faucet.faucetIntervalHours

      return canClaim
    }

    return true
  },
})

const fromTelegram = ({ username, id, language_code }) => {
  const user = new User()

  user.username = username
  user.chatId = id
  user.language = language_code

  return user
}

module.exports = herbarium.entities.add(User, "User").entity
module.exports.fromTelegram = fromTelegram
