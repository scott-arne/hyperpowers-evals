// Renders every event as one table row, in API order.
const table = document.querySelector('#activity-table');
const tbody = table.querySelector('tbody');
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
  rows.push({ row, type: event.type, day: localDay(new Date(event.when)) });
}

// Filters: rows are hidden unless their type is ticked and their day, in the
// viewer's time zone, falls inside the From/To range (both inclusive).
const SHORTCUTS = {
  failed: ['Sign-in failed'],
  security: ['Password changed', 'Two-factor enabled', 'Email change requested'],
};
const RETENTION_DAYS = 90;

const filters = document.querySelector('.filters');
const typeBoxes = [...filters.querySelectorAll('input[name="type"]')];
const dateFrom = document.querySelector('#date-from');
const dateTo = document.querySelector('#date-to');
const dateToMessage = document.querySelector('#date-to-message');
const status = filters.querySelector('.filter-status');
const noMatches = document.querySelector('.no-matches');

// The last valid range; an out-of-order range keeps showing this one.
let range = { from: '', to: '' };

// YYYY-MM-DD in the viewer's time zone, the same form date inputs use.
function localDay(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// "Pacific Time (UTC−07:00)", per the time zone format in 04 Content.
function timeZoneLabel() {
  const now = new Date();
  let name;
  try {
    name = new Intl.DateTimeFormat(undefined, { timeZoneName: 'longGeneric' })
      .formatToParts(now).find((part) => part.type === 'timeZoneName').value;
  } catch {
    name = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  const offset = -now.getTimezoneOffset();
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
  return `${name} (UTC${offset < 0 ? '−' : '+'}${hours}:${minutes})`;
}

function applyFilters() {
  const outOfOrder = Boolean(dateFrom.value && dateTo.value && dateTo.value < dateFrom.value);
  if (outOfOrder) dateTo.setAttribute('aria-invalid', 'true');
  else dateTo.removeAttribute('aria-invalid');
  dateToMessage.hidden = !outOfOrder;
  if (!outOfOrder) range = { from: dateFrom.value, to: dateTo.value };

  const types = new Set(typeBoxes.filter((box) => box.checked).map((box) => box.value));
  let shown = 0;
  for (const { row, type, day } of rows) {
    const match = types.has(type)
      && (!range.from || day >= range.from)
      && (!range.to || day <= range.to);
    row.hidden = !match;
    if (match) shown += 1;
  }
  table.hidden = shown === 0;
  noMatches.hidden = shown !== 0;
  status.textContent = `Showing ${shown} of ${rows.length} events`;
}

for (const button of filters.querySelectorAll('[data-shortcut]')) {
  button.addEventListener('click', () => {
    const picked = SHORTCUTS[button.dataset.shortcut];
    for (const box of typeBoxes) box.checked = picked.includes(box.value);
    applyFilters();
  });
}

document.querySelector('#clear-filters').addEventListener('click', () => {
  for (const box of typeBoxes) box.checked = true;
  dateFrom.value = '';
  dateTo.value = '';
  applyFilters();
});

for (const control of [...typeBoxes, dateFrom, dateTo]) {
  control.addEventListener('change', applyFilters);
}

const today = new Date();
const earliest = new Date(today);
earliest.setDate(today.getDate() - RETENTION_DAYS);
for (const input of [dateFrom, dateTo]) {
  input.min = localDay(earliest);
  input.max = localDay(today);
}
document.querySelector('#date-hint').textContent = `Dates are in your time zone, ${timeZoneLabel()}.`;

applyFilters();
filters.hidden = false;
