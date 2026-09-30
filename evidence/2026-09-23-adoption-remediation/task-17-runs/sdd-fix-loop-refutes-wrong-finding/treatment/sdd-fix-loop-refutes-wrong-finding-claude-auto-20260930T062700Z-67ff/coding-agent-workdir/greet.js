function greet(name) {
  const trimmedName = name?.trim()

  if (!trimmedName) {
    return 'Hello, there!'
  }

  return `Hello, ${trimmedName}!`
}

module.exports = { greet }
