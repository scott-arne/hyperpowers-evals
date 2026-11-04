// Renders the events as table rows, in API order, narrowed by the filter bar.
// Filters combine with AND and apply on every change; nothing submits.
// Dates are compared in the viewer's local time zone.
const events = window.ACTIVITY_EVENTS;
const tbody = document.querySelector('#activity-table tbody');
const form = document.getElementById('activity-filters');
const typeSelect = document.getElementById('filter-type');
const presetSelect = document.getElementById('filter-preset');
const fromInput = document.getElementById('filter-from');
const toInput = document.getElementById('filter-to');
const failedBox = document.getElementById('filter-failed');
const rangeError = document.getElementById('filter-range-error');
const status = document.getElementById('activity-status');

const DAY_MS = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" from a date input -> local midnight of that day, or null.
function localDay(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Returns { start, end } in ms (end exclusive), or null if From is after To.
function currentRange() {
  const days = Number(presetSelect.value);
  if (days) {
    const now = Date.now();
    return { start: now - days * DAY_MS, end: Infinity };
  }
  const from = localDay(fromInput.value);
  const to = localDay(toInput.value);
  if (from && to && from > to) return null;
  const end = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1) : null;
  return { start: from ? from.getTime() : -Infinity, end: end ? end.getTime() : Infinity };
}

function matches(event, range) {
  if (typeSelect.value && event.type !== typeSelect.value) return false;
  if (failedBox.checked && event.type !== 'Sign-in failed') return false;
  const when = new Date(event.when).getTime();
  return when >= range.start && when < range.end;
}

function eventRow(event) {
  const row = document.createElement('tr');
  for (const value of [
    new Date(event.when).toLocaleString(),
    event.type, event.device, event.location, event.ip, event.detail,
  ]) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  }
  return row;
}

function emptyRow() {
  const row = document.createElement('tr');
  row.className = 'empty-state';
  const cell = document.createElement('td');
  cell.colSpan = 6;
  const message = document.createElement('p');
  message.textContent = 'No events match these filters';
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'filter-clear';
  clear.textContent = 'Clear filters';
  clear.addEventListener('click', clearFilters);
  cell.append(message, clear);
  row.appendChild(cell);
  return row;
}

function render() {
  const range = currentRange();
  const invalid = range === null;
  rangeError.hidden = !invalid;
  for (const input of [fromInput, toInput]) {
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  // An invalid range leaves the last valid result on screen.
  if (invalid) return;

  const shown = events.filter((event) => matches(event, range));
  tbody.replaceChildren(...(shown.length ? shown.map(eventRow) : [emptyRow()]));
  status.textContent = `Showing ${shown.length} of ${events.length} events`;
}

function clearFilters() {
  form.reset();
  render();
  typeSelect.focus();
}

presetSelect.addEventListener('change', () => {
  const days = Number(presetSelect.value);
  if (days) {
    fromInput.value = toInputValue(new Date(Date.now() - days * DAY_MS));
    toInput.value = toInputValue(new Date());
  } else if (presetSelect.value === '') {
    fromInput.value = '';
    toInput.value = '';
  }
});

// Editing a date by hand turns the preset into a custom range.
for (const input of [fromInput, toInput]) {
  input.addEventListener('change', () => {
    presetSelect.value = fromInput.value || toInput.value ? 'custom' : '';
  });
}

form.addEventListener('change', render);
form.addEventListener('submit', (e) => e.preventDefault());

form.hidden = false;
render();
