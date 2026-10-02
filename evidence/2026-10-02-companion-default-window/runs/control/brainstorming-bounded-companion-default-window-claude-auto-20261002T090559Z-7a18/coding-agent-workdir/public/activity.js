// Renders the events as table rows, in API order, narrowed by the filters.
const { filterEvents, weekStartsOf, nextWeekStart } = window.ActivityFilters;
const events = window.ACTIVITY_EVENTS;
const tbody = document.querySelector('#activity-table tbody');
const form = document.getElementById('activity-filters');
const typeSelect = document.getElementById('filter-type');
const weekSelect = document.getElementById('filter-week');
const status = document.getElementById('activity-status');

function renderRows(rows) {
  tbody.replaceChildren();
  if (rows.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'No events match these filters.';
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

function update() {
  const rows = filterEvents(events, { type: typeSelect.value, week: weekSelect.value });
  renderRows(rows);
  status.textContent = `Showing ${rows.length.toLocaleString()} of ${events.length.toLocaleString()} events`;
}

// One option per week that has events, labeled with its Monday–Sunday range.
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
for (const start of weekStartsOf(events)) {
  const option = document.createElement('option');
  option.value = String(start);
  option.textContent = dateFormat.formatRange(new Date(start), new Date(nextWeekStart(start) - 1));
  weekSelect.appendChild(option);
}

form.addEventListener('change', update);
form.addEventListener('submit', (submitEvent) => submitEvent.preventDefault());
form.hidden = false;
update();
