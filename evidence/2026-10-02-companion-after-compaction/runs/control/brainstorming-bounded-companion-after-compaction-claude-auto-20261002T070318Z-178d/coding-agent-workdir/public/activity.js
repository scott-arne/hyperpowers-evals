// Renders every event as one table row, in API order.
const tbody = document.querySelector('#activity-table tbody');
for (const event of window.ACTIVITY_EVENTS) {
  const row = document.createElement('tr');
  row.dataset.type = event.type;
  row.dataset.when = event.when;
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

// Filters. They work on the rows already in the table, so they keep working
// if the rows are ever rendered by the server instead of above.
const SHORTCUTS = {
  failed: ['Sign-in failed'],
  security: ['Password changed', 'Two-factor enabled', 'Email change requested'],
};
const WEEKS_SHOWN = 13; // Covers the 90-day retention window.

const form = document.querySelector('#activity-filters');
const typeSelect = document.querySelector('#filter-type');
const weekSelect = document.querySelector('#filter-week');
const count = document.querySelector('#activity-count');
const rows = Array.from(tbody.querySelectorAll('tr[data-type]'));

// Monday-to-Sunday weeks in the viewer's time zone, newest first.
const weeks = [];
const weekStart = new Date();
weekStart.setHours(0, 0, 0, 0);
weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
const rangeFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
for (let i = 0; i < WEEKS_SHOWN; i++) {
  const start = new Date(weekStart);
  start.setDate(start.getDate() - 7 * i);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const lastDay = new Date(end);
  lastDay.setDate(lastDay.getDate() - 1);
  weeks.push({ start, end });
  weekSelect.add(new Option(rangeFormat.formatRange(start, lastDay), String(i)));
}

const emptyRow = document.createElement('tr');
emptyRow.className = 'activity-empty';
emptyRow.hidden = true;
const emptyCell = document.createElement('td');
emptyCell.colSpan = 6;
const emptyTitle = document.createElement('p');
emptyTitle.className = 'activity-empty-title';
emptyTitle.textContent = 'Events that match your filters appear here';
const emptyBody = document.createElement('p');
emptyBody.className = 'activity-empty-body';
emptyBody.textContent = 'Choose another event type or week.';
emptyCell.append(emptyTitle, emptyBody);
emptyRow.appendChild(emptyCell);
tbody.appendChild(emptyRow);

function matchesType(type) {
  const choice = typeSelect.value;
  if (choice === 'all') return true;
  if (SHORTCUTS[choice]) return SHORTCUTS[choice].includes(type);
  return type === choice;
}

function matchesWeek(when) {
  if (weekSelect.value === 'all') return true;
  const { start, end } = weeks[Number(weekSelect.value)];
  const time = new Date(when);
  return time >= start && time < end;
}

function plural(n) {
  return n === 1 ? '1 event' : `${n} events`;
}

function applyFilters() {
  let shown = 0;
  for (const row of rows) {
    const match = matchesType(row.dataset.type) && matchesWeek(row.dataset.when);
    row.hidden = !match;
    if (match) shown++;
  }
  emptyRow.hidden = shown > 0;
  count.textContent = shown === rows.length
    ? `Showing all ${plural(rows.length)}`
    : `Showing ${shown} of ${plural(rows.length)}`;
}

form.addEventListener('change', applyFilters);
form.addEventListener('submit', (e) => e.preventDefault());
form.hidden = false;
applyFilters();
