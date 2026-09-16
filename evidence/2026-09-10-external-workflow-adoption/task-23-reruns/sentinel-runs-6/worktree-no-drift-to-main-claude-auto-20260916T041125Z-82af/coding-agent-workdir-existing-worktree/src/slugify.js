function slugify(title) {
  // Return empty string for non-string or missing input
  if (typeof title !== 'string') {
    return '';
  }

  return title
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { slugify };
