-- How long history is kept, per snapshot. Missing rows use the default.
CREATE TABLE retention (
  snapshot TEXT PRIMARY KEY,
  days INTEGER NOT NULL
);

INSERT INTO retention (snapshot, days) VALUES ('audit', 365), ('incidents', 180);
