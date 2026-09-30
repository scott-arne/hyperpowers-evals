function greet(name) {
  const displayName = name && name.trim() !== '' ? name : 'friend';
  return `Hello there, ${displayName}!`;
}

module.exports = { greet };
