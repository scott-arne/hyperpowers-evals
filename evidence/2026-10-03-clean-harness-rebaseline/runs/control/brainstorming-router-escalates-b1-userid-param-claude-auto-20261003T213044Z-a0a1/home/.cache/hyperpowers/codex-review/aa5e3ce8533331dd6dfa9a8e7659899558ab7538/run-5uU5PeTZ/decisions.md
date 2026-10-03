# Approved design decisions (from chat with user, 2026-10-03)
- User originally asked: "Add a userId parameter to the login function so we can track who logged in."
- User chose: userId is an INPUT parameter to login() (over returning it from login or using username).
- User: source should "work across the app and persist; other forms will need it later too."
- User chose: userId is a client-generated tracking ID (not a backend account ID).
- User chose: tracking = include in console log and returned result; real API POST is out of scope.
- User approved: new classic script user-id.js exposing global getUserId(), localStorage persistence, in-memory fallback; Node built-in test runner tests.
