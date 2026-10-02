// Renders the events that match the filter bar as table rows, in API order.
const SECURITY_TYPES = ['Password changed', 'Two-factor enabled', 'Email change requested'];
const DATE_ORDER_MESSAGE = 'The end date must be after the start date.';

const events = window.ACTIVITY_EVENTS;
const tbody = document.querySelector('#activity-table tbody');
const form = document.getElementById('activity-filters');
const eventSelect = document.getElementById('filter-event');
const presetSelect = document.getElementById('filter-preset');
const fromInput = document.getElementById('filter-from');
const toInput = document.getElementById('filter-to');
const dateError = document.getElementById('filter-date-error');
const status = document.getElementById('filter-status');

function renderRows(rows) {
  tbody.replaceChildren();
  if (rows.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'empty-state';
    const title = document.createElement('p');
    title.className = 'empty-state-title';
    title.textContent = 'No matching events';
    const body = document.createElement('p');
    body.textContent = 'Try a different event type or date range.';
    cell.append(title, body);
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  for (const event of rows) {
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
  }
}

// Date inputs give "YYYY-MM-DD"; read it as midnight in the viewer's time zone.
function parseDay(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDay(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysAgo(count) {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return formatDay(date);
}

function matchesEvent(event, choice) {
  if (choice === 'all') return true;
  if (choice === 'failed') return event.type === 'Sign-in failed';
  if (choice === 'security') return SECURITY_TYPES.includes(event.type);
  return event.type === choice;
}

function applyFilters() {
  const from = fromInput.value ? parseDay(fromInput.value) : null;
  // The end date is inclusive, so compare against the start of the next day.
  const to = toInput.value ? parseDay(toInput.value) : null;
  if (to) to.setDate(to.getDate() + 1);

  const outOfOrder = Boolean(from && to && to <= from);
  for (const input of [fromInput, toInput]) {
    input.toggleAttribute('aria-invalid', outOfOrder);
  }
  dateError.textContent = outOfOrder ? DATE_ORDER_MESSAGE : '';
  if (outOfOrder) return;

  const rows = events.filter((event) => {
    const when = new Date(event.when);
    return matchesEvent(event, eventSelect.value)
      && (!from || when >= from)
      && (!to || when < to);
  });
  renderRows(rows);
  status.textContent = `Showing ${rows.length.toLocaleString()} of ${events.length.toLocaleString()} events`;
}

presetSelect.addEventListener('change', () => {
  if (presetSelect.value === 'custom') return;
  fromInput.value = presetSelect.value === 'any' ? '' : daysAgo(Number(presetSelect.value) - 1);
  toInput.value = presetSelect.value === 'any' ? '' : formatDay(new Date());
  applyFilters();
});

for (const input of [fromInput, toInput]) {
  input.min = daysAgo(89);
  input.max = formatDay(new Date());
  input.addEventListener('change', () => {
    presetSelect.value = fromInput.value || toInput.value ? 'custom' : 'any';
    applyFilters();
  });
}

eventSelect.addEventListener('change', applyFilters);

document.getElementById('filter-clear').addEventListener('click', () => {
  eventSelect.value = 'all';
  presetSelect.value = 'any';
  fromInput.value = '';
  toInput.value = '';
  applyFilters();
});

// Enter in a date field submits the form; filter in place instead of navigating.
form.addEventListener('submit', (submitEvent) => {
  submitEvent.preventDefault();
  applyFilters();
});

form.hidden = false;
applyFilters();
