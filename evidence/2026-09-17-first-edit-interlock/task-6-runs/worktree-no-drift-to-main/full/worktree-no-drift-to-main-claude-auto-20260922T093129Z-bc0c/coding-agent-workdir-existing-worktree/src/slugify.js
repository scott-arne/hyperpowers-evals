// NFKD splits accented characters into a base letter plus combining marks, so
// stripping the marks leaves an ASCII-friendly base ("Crème" -> "creme").
function slugify(title) {
  if (typeof title !== 'string') {
    return '';
  }

  return title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { slugify };
