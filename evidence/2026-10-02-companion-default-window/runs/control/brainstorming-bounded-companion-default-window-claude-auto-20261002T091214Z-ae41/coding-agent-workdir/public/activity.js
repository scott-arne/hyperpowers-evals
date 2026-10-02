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
  rows.push({ row, type: event.type, time: new Date(event.when) });
}

// Filters narrow the rows already on the page; the API returns the whole
// 90-day window, so nothing is fetched. Dates are whole days in the viewer's
// time zone, both ends inclusive.
const form = document.querySelector('#activity-filters');
const period = form.elements.period;
const from = form.elements.from;
const to = form.elements.to;
const toMessage = document.querySelector('#filter-to-message');
const status = document.querySelector('#filter-status');
const RETENTION_DAYS = 90;

// YYYY-MM-DD for a local date, the value format of <input type="date">.
function dateValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dateValue(date);
}

// "Pacific Time (UTC−07:00)", per the 04 time zone format.
function zoneLabel() {
  const zonePart = (style) => new Intl.DateTimeFormat(undefined, { timeZoneName: style })
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName').value;
  const offset = zonePart('longOffset').replace('GMT', 'UTC').replace('-', '−');
  return `${zonePart('longGeneric')} (${offset === 'UTC' ? 'UTC+00:00' : offset})`;
}

function datesInOrder() {
  return !from.value || !to.value || from.value <= to.value;
}

function showDateValidity() {
  const valid = datesInOrder();
  if (valid) to.removeAttribute('aria-invalid');
  else to.setAttribute('aria-invalid', 'true');
  toMessage.textContent = valid ? '' : 'The end date must be after the start date.';
}

function applyFilters() {
  if (!datesInOrder()) return;
  const types = new Set([...form.querySelectorAll('[name="type"]:checked')].map((box) => box.value));
  const start = from.value ? new Date(`${from.value}T00:00`) : null;
  let end = null;
  if (to.value) {
    end = new Date(`${to.value}T00:00`);
    end.setDate(end.getDate() + 1);
  }
  let shown = 0;
  for (const { row, type, time } of rows) {
    const match = (types.size === 0 || types.has(type))
      && (!start || time >= start)
      && (!end || time < end);
    row.hidden = !match;
    if (match) shown += 1;
  }
  status.textContent = shown === 0
    ? 'No events match these filters.'
    : `Showing ${shown.toLocaleString()} of ${rows.length.toLocaleString()} events`;
}

function setPeriod(days) {
  from.value = daysAgo(days);
  to.value = daysAgo(0);
}

for (const input of [from, to]) {
  input.min = daysAgo(RETENTION_DAYS);
  input.max = daysAgo(0);
}
setPeriod(RETENTION_DAYS);
from.defaultValue = from.value;
to.defaultValue = to.value;
document.querySelector('#filter-zone-hint').textContent = `Dates are in your time zone, ${zoneLabel()}`;

form.addEventListener('change', (e) => {
  if (e.target === period) {
    if (period.value !== 'custom') setPeriod(Number(period.value));
  } else if (e.target === from || e.target === to) {
    period.value = 'custom';
  }
  if (datesInOrder()) showDateValidity();
  applyFilters();
});
from.addEventListener('blur', showDateValidity);
to.addEventListener('blur', showDateValidity);
form.addEventListener('submit', (e) => e.preventDefault());
// The reset event fires before the fields are restored.
form.addEventListener('reset', () => setTimeout(() => {
  showDateValidity();
  applyFilters();
}));

form.hidden = false;
applyFilters();
