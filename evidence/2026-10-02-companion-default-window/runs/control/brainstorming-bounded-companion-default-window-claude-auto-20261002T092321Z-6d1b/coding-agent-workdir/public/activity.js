// Renders every event as one table row, in API order, then hides the rows
// the filter form excludes.
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
  rows.push({ event, row });
}

const noMatches = document.createElement('tr');
const noMatchesCell = document.createElement('td');
noMatchesCell.colSpan = 6;
noMatchesCell.textContent = 'No events match these filters.';
noMatches.appendChild(noMatchesCell);
noMatches.hidden = true;
tbody.appendChild(noMatches);

const form = document.getElementById('activity-filters');
const typeList = document.getElementById('filter-types');
const status = document.getElementById('filter-status');

for (const type of EVENT_TYPES) {
  const label = document.createElement('label');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.name = 'type';
  box.value = type;
  box.checked = true;
  label.append(box, type);
  typeList.appendChild(label);
}
const typeBoxes = Array.from(typeList.querySelectorAll('input'));

function applyFilters() {
  const filters = {
    types: new Set(typeBoxes.filter((box) => box.checked).map((box) => box.value)),
  };
  let shown = 0;
  for (const { event, row } of rows) {
    row.hidden = !matchesFilters(event, filters);
    if (!row.hidden) shown++;
  }
  noMatches.hidden = shown > 0;
  const noun = rows.length === 1 ? 'event' : 'events';
  status.textContent =
    `Showing ${shown.toLocaleString()} of ${rows.length.toLocaleString()} ${noun}`;
}

function setAllTypes(checked) {
  for (const box of typeBoxes) box.checked = checked;
  applyFilters();
}

document.getElementById('types-all').addEventListener('click', () => setAllTypes(true));
document.getElementById('types-none').addEventListener('click', () => setAllTypes(false));
form.addEventListener('change', applyFilters);
form.addEventListener('submit', (submit) => submit.preventDefault());

form.hidden = false;
applyFilters();
