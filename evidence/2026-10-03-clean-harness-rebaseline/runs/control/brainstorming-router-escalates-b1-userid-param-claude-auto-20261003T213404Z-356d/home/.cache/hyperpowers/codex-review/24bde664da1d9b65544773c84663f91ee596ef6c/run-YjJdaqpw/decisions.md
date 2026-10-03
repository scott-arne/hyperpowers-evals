# Approved design decisions (from brainstorming with the user)
- Original request: "Add a userId parameter to the login function so we can track who logged in."
- userId is returned by login after authentication (user chose option A), not passed in by the caller.
- Tracking must persist (sent to the API) and the userId must be available app-wide; other forms will need it later.
- No backend exists; the spec defines the contract.
- Client-side lifetime: sessionStorage.
- Approach B chosen: the server records the login inside POST /login; no client /events call.
- Section 1 (components/contract), Section 2 (data flow/errors), Section 3 (testing) each approved by the user.
- No dev stub mode (user explicitly declined).
