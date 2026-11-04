// Renders every event as one table row, in API order, then wires up the
// filter bar. Rows are built once; filtering only shows or hides them.
const events = window.ACTIVITY_EVENTS;
const table = document.querySelector('#activity-table');
const tbody = table.querySelector('tbody');

// Calendar date of an event in the viewer's time zone, as YYYY-MM-DD so it
// compares directly with a date input's value.
function localDay(when) {
  const d = new Date(when);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const rows = events.map((event) => {
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
  return {
    row,
    type: event.type,
    day: localDay(event.when),
    text: [event.device, event.location, event.ip, event.detail].join(' ').toLowerCase(),
  };
});

const form = document.querySelector('#activity-filters');
const typeSelect = document.querySelector('#filter-type');
const fromInput = document.querySelector('#filter-from');
const toInput = document.querySelector('#filter-to');
const searchInput = document.querySelector('#filter-search');
const searchClear = document.querySelector('#filter-search-clear');
const dateError = document.querySelector('#filter-date-error');
const status = document.querySelector('#activity-status');
const empty = document.querySelector('#activity-empty');

// Event types in the order they first appear, so the list matches the data.
for (const type of new Set(events.map((e) => e.type))) {
  const option = document.createElement('option');
  option.value = type;
  option.textContent = type;
  typeSelect.appendChild(option);
}

// Limit the date pickers to the days the data covers.
const days = rows.map((r) => r.day).sort();
for (const input of [fromInput, toInput]) {
  input.min = days[0];
  input.max = days[days.length - 1];
}

function rangeIsReversed() {
  return fromInput.value && toInput.value && toInput.value < fromInput.value;
}

function applyFilters() {
  const type = typeSelect.value;
  const reversed = rangeIsReversed();
  const from = reversed ? '' : fromInput.value;
  const to = reversed ? '' : toInput.value;
  const query = searchInput.value.trim().toLowerCase();

  let shown = 0;
  for (const r of rows) {
    const match =
      (!type || r.type === type) &&
      (!from || r.day >= from) &&
      (!to || r.day <= to) &&
      (!query || r.text.includes(query));
    r.row.hidden = !match;
    if (match) shown += 1;
  }

  table.hidden = shown === 0;
  empty.hidden = shown !== 0;
  searchClear.hidden = searchInput.value === '';
  status.textContent = `Showing ${shown} of ${rows.length} events`;
}

// Validate the range on blur, as 03 Forms asks; clear the message as soon as
// the range is fixed so a stale error never lingers.
function showDateError() {
  const reversed = rangeIsReversed();
  dateError.textContent = reversed ? 'The end date must be after the start date.' : '';
  dateError.hidden = !reversed;
  toInput.setAttribute('aria-invalid', reversed ? 'true' : 'false');
}

function clearDateErrorIfFixed() {
  if (!rangeIsReversed()) showDateError();
}

function clearSearch() {
  searchInput.value = '';
  applyFilters();
}

form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('input', applyFilters);
form.addEventListener('change', applyFilters);
fromInput.addEventListener('blur', showDateError);
toInput.addEventListener('blur', showDateError);
fromInput.addEventListener('input', clearDateErrorIfFixed);
toInput.addEventListener('input', clearDateErrorIfFixed);

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    clearSearch();
  }
});

searchClear.addEventListener('click', () => {
  clearSearch();
  searchInput.focus();
});

document.querySelector('#filter-failed').addEventListener('click', () => {
  typeSelect.value = 'Sign-in failed';
  applyFilters();
});

document.querySelector('#filter-reset').addEventListener('click', () => {
  form.reset();
  showDateError();
  applyFilters();
});

form.hidden = false;
applyFilters();
