// Renders every event as one table row, in API order.
const tbody = document.querySelector('#activity-table tbody');
const rows = [];
for (const event of window.ACTIVITY_EVENTS) {
  const row = document.createElement('tr');
  for (const value of [
    new Date(event.when).toLocaleString(),
    event.type,
    event.device,
    event.location,
    event.ip,
    event.detail,
  ]) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  }
  tbody.appendChild(row);
  rows.push({ event, row });
}

// Filter bar: the controls combine with AND and filter the rows in place.
const form = document.getElementById('activity-filters');
const typeSelect = document.getElementById('filter-type');
const search = document.getElementById('filter-search');
const clearButton = document.getElementById('filter-search-clear');
const failedOnly = document.getElementById('filter-failed');
const count = document.getElementById('activity-count');

function applyFilters() {
  const type = typeSelect.value;
  const query = search.value.trim().toLowerCase();
  let shown = 0;
  for (const { event, row } of rows) {
    const haystack = [event.device, event.location, event.ip, event.detail]
      .join(' ')
      .toLowerCase();
    const match =
      (!type || event.type === type) &&
      (!failedOnly.checked || event.type === 'Sign-in failed') &&
      (!query || haystack.includes(query));
    row.hidden = !match;
    if (match) shown += 1;
  }
  clearButton.hidden = search.value === '';
  count.textContent = `Showing ${shown} of ${rows.length} events`;
}

function clearSearch() {
  search.value = '';
  applyFilters();
  search.focus();
}

form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('input', applyFilters);
form.addEventListener('change', applyFilters);
search.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && search.value !== '') {
    e.preventDefault();
    clearSearch();
  }
});
clearButton.addEventListener('click', clearSearch);

form.hidden = false;
applyFilters();
