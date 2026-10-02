// Pure filtering logic for the activity page. Loaded as a plain script in the
// browser (window.ActivityFilters) and required by the Node tests.
(function (root) {
  const SECURITY_CHANGES = ['Password changed', 'Two-factor enabled', 'Email change requested'];

  // Named groups over the API's fixed event types. They only combine
  // existing types; they never introduce new ones.
  const GROUPS = {
    all: null,
    failed: ['Sign-in failed'],
    security: SECURITY_CHANGES,
    'failed-security': ['Sign-in failed', ...SECURITY_CHANGES],
  };

  function matchesGroup(event, group) {
    const types = GROUPS[group];
    return !types || types.includes(event.type);
  }

  // Local midnight on the first day of the week containing `date`, in the
  // viewer's time zone. `firstDay` follows Intl week info: 1 is Monday, 7 is Sunday.
  function weekStart(date, firstDay) {
    const offset = (date.getDay() - (firstDay % 7) + 7) % 7;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
  }

  // Adding days through the Date constructor keeps local midnight across DST changes.
  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  // Every week from the newest event back to the oldest, newest first.
  function listWeeks(events, firstDay) {
    if (events.length === 0) return [];
    const times = events.map((event) => new Date(event.when).getTime());
    const oldest = weekStart(new Date(Math.min(...times)), firstDay);
    const weeks = [];
    for (let week = weekStart(new Date(Math.max(...times)), firstDay); week >= oldest; week = addDays(week, -7)) {
      weeks.push(week);
    }
    return weeks;
  }

  // `week` is the start of a week from listWeeks as a timestamp, or null for every week.
  function filterEvents(events, { group, week }) {
    const end = week === null ? null : addDays(new Date(week), 7).getTime();
    return events.filter((event) => {
      if (!matchesGroup(event, group)) return false;
      if (week === null) return true;
      const time = new Date(event.when).getTime();
      return time >= week && time < end;
    });
  }

  const api = { GROUPS, matchesGroup, weekStart, addDays, listWeeks, filterEvents };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ActivityFilters = api;
})(this);
