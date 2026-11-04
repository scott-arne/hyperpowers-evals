// Renders every event as one table row, in API order, then wires the filters.
// Filters only hide and show rows that are already in the table.
const tbody = document.querySelector('#activity-table tbody');
const events = window.ACTIVITY_EVENTS;

// YYYY-MM-DD in the viewer's time zone, the format <input type="date"> uses.
function localDay(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return localDay(date);
}

const rows = [];
for (const event of events) {
  const row = document.createElement('tr');
  row.dataset.type = event.type;
  row.dataset.day = localDay(new Date(event.when));
  for (const value of [
    new Date(event.when).toLocaleString(),
    event.type, event.device, event.location, event.ip, event.detail,
  ]) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  }
  tbody.appendChild(row);
  rows.push(row);
}

const emptyRow = document.createElement('tr');
const emptyCell = document.createElement('td');
emptyCell.colSpan = 6;
emptyCell.textContent = 'No events match these filters.';
emptyRow.appendChild(emptyCell);
emptyRow.hidden = true;
tbody.appendChild(emptyRow);

const TYPES = [
  'Sign-in', 'Sign-in failed', 'Sign-out', 'Session expired', 'Password changed',
  'Two-factor enabled', 'Email change requested', 'Settings updated', 'API token used',
];
const VIEWS = {
  all: TYPES,
  failed: ['Sign-in failed'],
  changes: ['Password changed', 'Two-factor enabled', 'Email change requested', 'Settings updated'],
};

const filters = document.querySelector('.filters');
const list = filters.querySelector('.checkbox-list');
const viewButtons = filters.querySelectorAll('[data-view]');
const from = document.getElementById('filter-from');
const to = document.getElementById('filter-to');
const toError = document.getElementById('filter-to-error');
const preset = document.getElementById('filter-preset');
const status = document.getElementById('filter-status');

const checkboxes = TYPES.map((type) => {
  const label = document.createElement('label');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.value = type;
  box.checked = true;
  label.append(box, ` ${type}`);
  list.appendChild(label);
  return box;
});

for (const input of [from, to]) {
  input.min = daysAgo(90);
  input.max = daysAgo(0);
}

function applyPreset(days) {
  from.value = daysAgo(Number(days));
  to.value = daysAgo(0);
}

function update() {
  const types = new Set(checkboxes.filter((box) => box.checked).map((box) => box.value));
  const reversed = from.value && to.value && to.value < from.value;
  to.setAttribute('aria-invalid', reversed ? 'true' : 'false');
  toError.hidden = !reversed;

  let shown = 0;
  for (const row of rows) {
    const inRange = reversed
      || ((!from.value || row.dataset.day >= from.value) && (!to.value || row.dataset.day <= to.value));
    row.hidden = !(types.has(row.dataset.type) && inRange);
    if (!row.hidden) shown += 1;
  }
  emptyRow.hidden = shown > 0;
  status.textContent = `Showing ${shown} of ${rows.length} events`;

  for (const button of viewButtons) {
    const view = VIEWS[button.dataset.view];
    const match = view.length === types.size && view.every((type) => types.has(type));
    button.setAttribute('aria-pressed', String(match));
  }
}

for (const button of viewButtons) {
  button.addEventListener('click', () => {
    const view = VIEWS[button.dataset.view];
    for (const box of checkboxes) box.checked = view.includes(box.value);
    update();
  });
}
list.addEventListener('change', update);
for (const input of [from, to]) {
  input.addEventListener('change', () => {
    preset.value = 'custom';
    update();
  });
}
preset.addEventListener('change', () => {
  if (preset.value !== 'custom') applyPreset(preset.value);
  update();
});
document.getElementById('filter-clear').addEventListener('click', () => {
  for (const box of checkboxes) box.checked = true;
  preset.value = '90';
  applyPreset(90);
  update();
});

applyPreset(90);
update();
filters.hidden = false;
