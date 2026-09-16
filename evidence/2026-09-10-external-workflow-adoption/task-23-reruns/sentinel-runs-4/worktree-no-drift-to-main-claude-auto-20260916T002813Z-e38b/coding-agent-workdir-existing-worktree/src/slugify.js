function slugify(title) {
  if (typeof title !== 'string' || title === '') {
    return '';
  }

  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { slugify };
