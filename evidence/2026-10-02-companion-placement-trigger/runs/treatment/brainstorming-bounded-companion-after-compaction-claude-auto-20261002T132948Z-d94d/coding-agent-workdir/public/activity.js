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

// Filters the rendered rows in place. Nothing here submits or navigates.
const SECURITY_TYPES = ['Password changed', 'Two-factor enabled', 'Email change requested'];

const form = document.getElementById('activity-filters');
const typeSelect = document.getElementById('filter-type');
const rangeSelect = document.getElementById('filter-range');
const fromInput = document.getElementById('filter-from');
const toInput = document.getElementById('filter-to');
const dateError = document.getElementById('filter-date-error');
const searchInput = document.getElementById('filter-search');
const clearButton = document.getElementById('filter-search-clear');
const count = document.getElementById('activity-count');

// 'YYYY-MM-DD' for a Date, in the viewer's time zone (what date inputs use).
function toDateValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Local midnight at the start of a 'YYYY-MM-DD' value.
function startOfDay(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function applyFilters() {
  const type = typeSelect.value;
  const query = searchInput.value.trim().toLowerCase();

  const datesInvalid = fromInput.value && toInput.value && toInput.value < fromInput.value;
  dateError.hidden = !datesInvalid;
  for (const input of [fromInput, toInput]) {
    if (datesInvalid) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', dateError.id);
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  }
  // Both ends are inclusive; ignore the date range while it is invalid.
  const from = !datesInvalid && fromInput.value ? startOfDay(fromInput.value) : null;
  let to = null;
  if (!datesInvalid && toInput.value) {
    to = startOfDay(toInput.value);
    to.setDate(to.getDate() + 1);
  }

  let shown = 0;
  for (const { event, row } of rows) {
    const when = new Date(event.when);
    const visible =
      (type === 'all' || (type === 'security' ? SECURITY_TYPES.includes(event.type) : event.type === type)) &&
      (!from || when >= from) &&
      (!to || when < to) &&
      (!query || [event.device, event.location, event.ip, event.detail]
        .some((value) => value.toLowerCase().includes(query)));
    row.hidden = !visible;
    if (visible) shown++;
  }
  count.textContent = `Showing ${shown} of ${rows.length} events`;
  clearButton.hidden = !searchInput.value;
}

rangeSelect.addEventListener('change', () => {
  if (rangeSelect.value === 'any') {
    fromInput.value = '';
    toInput.value = '';
  } else if (rangeSelect.value !== 'custom') {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (Number(rangeSelect.value) - 1));
    fromInput.value = toDateValue(start);
    toInput.value = toDateValue(today);
  }
  applyFilters();
});

for (const input of [fromInput, toInput]) {
  input.addEventListener('input', () => {
    rangeSelect.value = fromInput.value || toInput.value ? 'custom' : 'any';
    applyFilters();
  });
}

typeSelect.addEventListener('change', applyFilters);
searchInput.addEventListener('input', applyFilters);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && searchInput.value) {
    searchInput.value = '';
    applyFilters();
  }
});
clearButton.addEventListener('click', () => {
  searchInput.value = '';
  searchInput.focus();
  applyFilters();
});
form.addEventListener('submit', (e) => e.preventDefault());

form.hidden = false;
applyFilters();
