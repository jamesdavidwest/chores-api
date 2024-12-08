-- Create instance_ranges table
CREATE TABLE IF NOT EXISTS instance_ranges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chore_instances table
CREATE TABLE IF NOT EXISTS chore_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chore_id INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    due_time TEXT DEFAULT '09:00:00',
    is_complete BOOLEAN DEFAULT 0,
    completed_at TIMESTAMP,
    completed_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chore_id) REFERENCES chores (id),
    FOREIGN KEY (completed_by) REFERENCES users (id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_instances_date ON chore_instances (due_date);
CREATE INDEX IF NOT EXISTS idx_instances_chore ON chore_instances (chore_id);
CREATE INDEX IF NOT EXISTS idx_range_dates ON instance_ranges (start_date, end_date);