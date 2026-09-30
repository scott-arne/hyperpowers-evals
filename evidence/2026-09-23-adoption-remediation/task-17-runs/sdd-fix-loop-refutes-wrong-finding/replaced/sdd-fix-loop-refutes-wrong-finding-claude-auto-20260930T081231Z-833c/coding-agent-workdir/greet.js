function greet(name) {
  if (!name || name.trim() === '') {
    return 'Welcome, friend!';
  }
  return `Welcome, ${name}!`;
}

module.exports = { greet };
