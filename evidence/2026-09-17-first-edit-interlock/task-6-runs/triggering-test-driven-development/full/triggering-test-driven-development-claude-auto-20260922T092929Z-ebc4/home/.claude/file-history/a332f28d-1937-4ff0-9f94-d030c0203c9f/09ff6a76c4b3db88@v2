function greet(name) {
  return `Hello, ${name}!`;
}

// Deliberately a structural check, not RFC 5322 validation: one @ with a
// non-empty local part, and a domain dot that is not on either edge. Anything
// stricter (quoted local parts, IP literals, length limits) was ruled out as
// more surface area than this project needs.
function isValidEmail(email) {
  if (typeof email !== 'string') return false;

  const at = email.indexOf('@');
  if (at < 1 || at !== email.lastIndexOf('@')) return false;

  const domain = email.slice(at + 1);
  return domain.indexOf('.') > 0 && domain.lastIndexOf('.') < domain.length - 1;
}

module.exports = { greet, isValidEmail };
