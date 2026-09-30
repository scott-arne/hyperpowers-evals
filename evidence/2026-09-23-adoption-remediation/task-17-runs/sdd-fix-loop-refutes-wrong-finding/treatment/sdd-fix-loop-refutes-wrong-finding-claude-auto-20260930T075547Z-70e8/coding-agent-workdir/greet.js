function greet(name, format) {
  // Handle empty, null, or undefined names gracefully
  const effectiveName = name || 'friend';

  // Apply custom formatting based on the format parameter
  switch (format) {
    case 'formal':
      return `Good day, ${effectiveName}.`;
    case 'casual':
      return `Hey, ${effectiveName}!`;
    default:
      return `Hello, ${effectiveName}!`;
  }
}

module.exports = { greet };
