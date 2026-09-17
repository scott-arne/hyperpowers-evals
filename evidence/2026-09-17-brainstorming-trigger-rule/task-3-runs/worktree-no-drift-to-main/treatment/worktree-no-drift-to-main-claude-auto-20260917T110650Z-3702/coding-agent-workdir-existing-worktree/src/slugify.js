// Combining marks left behind by NFKD decomposition (e.g. the accent in "é").
const COMBINING_MARKS = /[̀-ͯ]/g;

function slugify(title) {
  if (typeof title !== 'string') {
    return '';
  }

  return title
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { slugify };
