function greet(name, options) {
  const effectiveName = (name && typeof name === 'string' && name.trim()) ? name : 'Guest';
  const format = (options && options.format) ? options.format : 'Hello, {name}!';
  return format.replaceAll('{name}', () => effectiveName);
}

module.exports = { greet };
