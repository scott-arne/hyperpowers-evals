// Filtering for the activity table. No DOM access, so it can be tested in Node.
// Type filter values: '' (all), 'group:<name>', or 'type:<event type>'.
// Week filter values: '' (any time) or the week's start in epoch milliseconds.
window.ActivityFilters = (() => {
  const GROUPS = {
    failed: ['Sign-in failed'],
    security: ['Password changed', 'Two-factor enabled', 'Email change requested'],
  };

  // Monday 00:00 of the event's week, in the viewer's time zone.
  function weekStart(when) {
    const date = new Date(when);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return date.getTime();
  }

  // The following Monday 00:00. Built from the calendar date rather than by
  // adding a fixed number of milliseconds, so a week that contains a daylight
  // saving change still ends at midnight.
  function nextWeekStart(start) {
    const date = new Date(start);
    date.setDate(date.getDate() + 7);
    return date.getTime();
  }

  function matchesType(event, type) {
    if (!type) return true;
    if (type.startsWith('group:')) return GROUPS[type.slice(6)].includes(event.type);
    return event.type === type.slice(5);
  }

  function matchesWeek(event, week) {
    if (!week) return true;
    const start = Number(week);
    const when = new Date(event.when).getTime();
    return when >= start && when < nextWeekStart(start);
  }

  function filterEvents(events, { type, week }) {
    return events.filter((event) => matchesType(event, type) && matchesWeek(event, week));
  }

  // Distinct week starts covering the events, newest first.
  function weekStartsOf(events) {
    return [...new Set(events.map((event) => weekStart(event.when)))].sort((a, b) => b - a);
  }

  return { filterEvents, weekStartsOf, nextWeekStart };
})();
