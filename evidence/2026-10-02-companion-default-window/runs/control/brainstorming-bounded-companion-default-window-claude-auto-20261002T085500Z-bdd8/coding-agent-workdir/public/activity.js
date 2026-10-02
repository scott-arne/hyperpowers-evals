// Renders the events as table rows, in API order, narrowed by the filters.
const { listWeeks, filterEvents, addDays } = window.ActivityFilters;
const events = window.ACTIVITY_EVENTS;
const tbody = document.querySelector('#activity-table tbody');
const form = document.querySelector('#activity-filters');
const groupSelect = document.querySelector('#filter-group');
const weekSelect = document.querySelector('#filter-week');
const status = document.querySelector('#filter-status');

// First day of the week for the viewer's locale (1 is Monday, 7 is Sunday).
// Browsers without Intl week info fall back to Monday.
function localeFirstDay() {
  try {
    const locale = new Intl.Locale(navigator.language);
    const info = locale.getWeekInfo ? locale.getWeekInfo() : locale.weekInfo;
    return (info && info.firstDay) || 1;
  } catch {
    return 1;
  }
}

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
  const week = weekSelect.value === '' ? null : Number(weekSelect.value);
  const rows = filterEvents(events, { group: groupSelect.value, week });
  renderRows(rows);
  status.textContent = `Showing ${rows.length.toLocaleString()} of ${events.length.toLocaleString()} events`;
}

const weekFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
for (const week of listWeeks(events, localeFirstDay())) {
  const option = document.createElement('option');
  option.value = String(week.getTime());
  option.textContent = weekFormat.formatRange(week, addDays(week, 6));
  weekSelect.appendChild(option);
}

form.addEventListener('submit', (submitEvent) => submitEvent.preventDefault());
groupSelect.addEventListener('change', update);
weekSelect.addEventListener('change', update);
form.hidden = false;
update();
