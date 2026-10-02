// Renders every event as one table row, in API order, then wires the filters.
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
  rows.push({ row, event });
}

// Filters hide rows in place; the API already returned the whole 90-day window.
const RETENTION_DAYS = 90;
const { firstDayOfWeek, weeksInWindow, matches } = window.ActivityFilters;
const form = document.getElementById('activity-filters');
const eventSelect = document.getElementById('filter-event');
const weekSelect = document.getElementById('filter-week');
const status = document.getElementById('activity-status');

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
for (const week of weeksInWindow(new Date(), RETENTION_DAYS, firstDayOfWeek())) {
  const lastDay = new Date(week.end);
  lastDay.setDate(lastDay.getDate() - 1);
  weekSelect.add(new Option(dateFormat.formatRange(week.start, lastDay), week.key));
}

function applyFilters() {
  let shown = 0;
  for (const { row, event } of rows) {
    row.hidden = !matches(event, eventSelect.value, weekSelect.value);
    if (!row.hidden) shown += 1;
  }
  const total = rows.length.toLocaleString();
  status.textContent = shown === 0
    ? 'No events match these filters.'
    : `Showing ${shown.toLocaleString()} of ${total} ${rows.length === 1 ? 'event' : 'events'}`;
}

form.addEventListener('change', applyFilters);
form.addEventListener('submit', (e) => e.preventDefault());
form.hidden = false;
applyFilters();
