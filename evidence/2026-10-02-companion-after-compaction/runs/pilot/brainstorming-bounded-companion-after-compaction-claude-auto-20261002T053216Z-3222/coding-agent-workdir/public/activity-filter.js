// Pure filtering for the activity page: no DOM access, so it runs under
// node --test as well as in the browser (as window.ActivityFilter).
// Weeks run Monday to Sunday in the viewer's local time zone.
(function () {
  function mondayOf(date) {
    const daysSinceMonday = (date.getDay() + 6) % 7;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday);
  }

  function weekKey(date) {
    const monday = mondayOf(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  }

  // Every week from the newest event back to the oldest, newest first,
  // including weeks with no events so the list has no surprising gaps.
  function listWeeks(events, locale) {
    if (events.length === 0) return [];
    const times = events.map((e) => new Date(e.when).getTime());
    const oldest = mondayOf(new Date(Math.min(...times)));
    const weeks = [];
    for (let monday = mondayOf(new Date(Math.max(...times))); monday >= oldest;
      monday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7)) {
      weeks.push({
        value: weekKey(monday),
        label: `Week of ${monday.toLocaleDateString(locale, { dateStyle: 'medium' })}`,
      });
    }
    return weeks;
  }

  // filters: { types: string[] (empty means all), search: string, week: '' or a listWeeks value }
  function filterEvents(events, filters) {
    const search = filters.search.trim().toLowerCase();
    return events.filter((e) =>
      (filters.types.length === 0 || filters.types.includes(e.type)) &&
      (search === '' || e.device.toLowerCase().includes(search) ||
        e.location.toLowerCase().includes(search)) &&
      (filters.week === '' || weekKey(new Date(e.when)) === filters.week));
  }

  const api = { listWeeks, filterEvents };
  if (typeof module !== 'undefined') module.exports = api;
  else window.ActivityFilter = api;
})();
