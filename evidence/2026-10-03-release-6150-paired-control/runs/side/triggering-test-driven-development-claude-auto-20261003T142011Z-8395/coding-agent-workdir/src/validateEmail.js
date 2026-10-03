function validateEmail(email) {
  const at = email.indexOf('@');
  if (at < 1) return false;
  const domain = email.slice(at + 1);
  return domain.includes('.');
}

module.exports = { validateEmail };
