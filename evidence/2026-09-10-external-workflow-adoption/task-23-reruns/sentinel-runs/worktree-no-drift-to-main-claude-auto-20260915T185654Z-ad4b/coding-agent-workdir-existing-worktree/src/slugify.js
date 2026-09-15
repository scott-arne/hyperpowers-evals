function slugify(title) {
  if (typeof title !== 'string' || !title.trim()) {
    return '';
  }

  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { slugify };
