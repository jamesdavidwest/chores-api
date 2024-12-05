CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS frequency_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location_id INTEGER,
    frequency_id INTEGER,
    assigned_to INTEGER,
    next_occurrence TEXT,
    time_preference TEXT DEFAULT '09:00:00',
    last_completed TEXT,
    FOREIGN KEY (location_id) REFERENCES locations (id),
    FOREIGN KEY (frequency_id) REFERENCES frequency_types (id),
    FOREIGN KEY (assigned_to) REFERENCES users (id)
);