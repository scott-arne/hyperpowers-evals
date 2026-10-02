// Renders every event as one table row, in API order.
const tbody = document.querySelector('#activity-table tbody');
const rows = [];
for (const event of window.ACTIVITY_EVENTS) {
  const row = document.createElement('tr');
  for (const value of [
    new Date(event.when).toLocaleString(),
    event.type, event.device, event.location, event.ip, event.detail,
  ]) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  }
  tbody.appendChild(row);
  rows.push({ row, type: event.type, day: localDay(new Date(event.when)) });
}

// Filters. The form is hidden in the markup so it only appears when this
// script runs; the table itself does not depend on it.
const SHORTCUTS = {
  failed: ['Sign-in failed'],
  security: ['Password changed', 'Two-factor enabled', 'Email change requested'],
};

const form = document.getElementById('activity-filters');
const typeSelect = document.getElementById('filter-type');
const presetSelect = document.getElementById('filter-preset');
const fromInput = document.getElementById('filter-from');
const toInput = document.getElementById('filter-to');
const dateError = document.getElementById('filter-date-error');
const count = document.getElementById('activity-count');
const shortcutButtons = form.querySelectorAll('[data-shortcut]');

// The viewer's calendar day, as YYYY-MM-DD, so it compares with date inputs.
function localDay(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Monday-to-Sunday week containing `date`, shifted by `weeksBack`.
function weekRange(date, weeksBack) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7 * weeksBack);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [localDay(start), localDay(end)];
}

function matchesType(type) {
  const value = typeSelect.value;
  if (value === 'all') return true;
  if (SHORTCUTS[value]) return SHORTCUTS[value].includes(type);
  return type === value;
}

function applyFilters() {
  const from = fromInput.value;
  const to = toInput.value;
  let shown = 0;
  for (const { row, type, day } of rows) {
    const visible = matchesType(type)
      && (!from || day >= from)
      && (!to || day <= to);
    row.hidden = !visible;
    if (visible) shown += 1;
  }
  for (const button of shortcutButtons) {
    button.setAttribute('aria-pressed', String(typeSelect.value === button.dataset.shortcut));
  }
  count.textContent = `Showing ${shown} of ${rows.length} events`
    + (shown === 0 ? '. Clear filters to see everything.' : '');
}

// Validated on blur, per the forms guidelines, not on every change.
function validateDates() {
  const invalid = Boolean(fromInput.value && toInput.value && fromInput.value > toInput.value);
  dateError.hidden = !invalid;
  toInput.setAttribute('aria-invalid', String(invalid));
}

for (const button of shortcutButtons) {
  button.addEventListener('click', () => {
    const shortcut = button.dataset.shortcut;
    typeSelect.value = typeSelect.value === shortcut ? 'all' : shortcut;
    applyFilters();
  });
}

typeSelect.addEventListener('change', applyFilters);

presetSelect.addEventListener('change', () => {
  const preset = presetSelect.value;
  if (preset === 'all') {
    fromInput.value = '';
    toInput.value = '';
  } else if (preset !== 'custom') {
    [fromInput.value, toInput.value] = weekRange(new Date(), preset === 'last-week' ? 1 : 0);
  }
  validateDates();
  applyFilters();
});

for (const input of [fromInput, toInput]) {
  input.addEventListener('change', () => {
    presetSelect.value = 'custom';
    applyFilters();
  });
  input.addEventListener('blur', validateDates);
}

document.getElementById('filter-clear').addEventListener('click', () => {
  typeSelect.value = 'all';
  presetSelect.value = 'all';
  fromInput.value = '';
  toInput.value = '';
  validateDates();
  applyFilters();
});

if (rows.length) {
  const days = rows.map((r) => r.day).sort();
  for (const input of [fromInput, toInput]) {
    input.min = days[0];
    input.max = days[days.length - 1];
  }
}

form.addEventListener('submit', (e) => e.preventDefault());
form.hidden = false;
applyFilters();
