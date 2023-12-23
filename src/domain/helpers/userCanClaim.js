const userCanClaim = (dateToCompare, interval) => {
  if (dateToCompare instanceof Date) {
    const diff = new Date() - dateToCompare

    const diffHours = diff / 3600000

    const canClaim = diffHours > interval

    return { canClaim, diffHours }
  }

  return { canClaim: true }
}

module.exports = userCanClaim
