-- Core User Management
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'MANAGER', 'USER', 'GUEST')),
    timezone TEXT DEFAULT 'UTC',
    preferences TEXT, -- JSON string for flexible preferences storage
    points_balance INTEGER DEFAULT 0,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Profile Extensions
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    date_of_birth TEXT,
    avatar_url TEXT,
    preferred_notification_time TEXT DEFAULT '09:00:00',
    notification_methods TEXT, -- JSON array: ['email', 'push', 'sms']
    theme_preference TEXT DEFAULT 'light',
    language_preference TEXT DEFAULT 'en',
    accessibility_settings TEXT, -- JSON object for accessibility preferences
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Relationships (for family/team structures)
CREATE TABLE IF NOT EXISTS user_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    related_user_id INTEGER,
    relationship_type TEXT CHECK(relationship_type IN ('parent', 'child', 'guardian', 'supervisor', 'peer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (related_user_id) REFERENCES users(id)
);

-- Location Management with Hierarchy
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_location_id INTEGER,
    floor INTEGER,
    area_square_feet REAL,
    notes TEXT,
    requires_supplies TEXT, -- JSON array of required supplies
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_location_id) REFERENCES locations(id)
);

-- Categories for Task Organization
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT,
    color_code TEXT,
    parent_category_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(id)
);

-- Frequency Patterns
CREATE TABLE IF NOT EXISTS frequency_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(name IN ('once', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom')),
    interval_days INTEGER, -- For custom frequencies
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task Templates (formerly chores)
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    location_id INTEGER,
    frequency_id INTEGER,
    assigned_to INTEGER,
    assigned_by INTEGER,
    priority INTEGER DEFAULT 2, -- 1 (High) to 5 (Low)
    estimated_duration INTEGER, -- in minutes
    points_value INTEGER DEFAULT 0,
    required_supplies TEXT, -- JSON array of supply IDs
    instructions TEXT,
    minimum_age INTEGER,
    requires_verification BOOLEAN DEFAULT FALSE,
    requires_photo BOOLEAN DEFAULT FALSE,
    weather_dependent BOOLEAN DEFAULT FALSE,
    time_preference TEXT DEFAULT '09:00:00',
    reminder_before INTEGER, -- minutes before due
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (frequency_id) REFERENCES frequency_types(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Task Dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    depends_on_task_id INTEGER,
    dependency_type TEXT CHECK(dependency_type IN ('required', 'recommended', 'optional')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id)
);

-- Task Instances
CREATE TABLE IF NOT EXISTS task_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    assigned_to INTEGER,
    due_date TEXT NOT NULL,
    due_time TEXT DEFAULT '09:00:00',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'verified', 'skipped', 'failed')) DEFAULT 'pending',
    completion_notes TEXT,
    completed_by INTEGER,
    completed_at TIMESTAMP,
    verified_by INTEGER,
    verified_at TIMESTAMP,
    verification_status TEXT CHECK(verification_status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    actual_duration INTEGER, -- in minutes
    weather_conditions TEXT, -- For weather-dependent tasks
    photos TEXT, -- JSON array of photo URLs
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (completed_by) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Instance Generation Tracking
CREATE TABLE IF NOT EXISTS instance_ranges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    generated_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Inventory Management
CREATE TABLE IF NOT EXISTS supplies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    current_quantity INTEGER DEFAULT 0,
    minimum_quantity INTEGER DEFAULT 1,
    unit TEXT DEFAULT 'unit',
    location_id INTEGER,
    last_purchased TIMESTAMP,
    purchase_url TEXT,
    estimated_cost REAL,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Supply Transactions
CREATE TABLE IF NOT EXISTS supply_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supply_id INTEGER,
    transaction_type TEXT CHECK(transaction_type IN ('purchase', 'use', 'adjustment')),
    quantity INTEGER,
    task_instance_id INTEGER,
    user_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supply_id) REFERENCES supplies(id),
    FOREIGN KEY (task_instance_id) REFERENCES task_instances(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Rewards and Gamification
CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Point Transactions
CREATE TABLE IF NOT EXISTS point_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    transaction_type TEXT CHECK(transaction_type IN ('earned', 'spent', 'adjusted')),
    points_amount INTEGER,
    task_instance_id INTEGER,
    reward_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_instance_id) REFERENCES task_instances(id),
    FOREIGN KEY (reward_id) REFERENCES rewards(id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT CHECK(type IN ('reminder', 'completion', 'verification', 'reward', 'system')),
    title TEXT NOT NULL,
    message TEXT,
    status TEXT CHECK(status IN ('pending', 'sent', 'read', 'failed')) DEFAULT 'pending',
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Performance Optimization Indices
CREATE INDEX IF NOT EXISTS idx_task_instances_task_id ON task_instances(task_id);
CREATE INDEX IF NOT EXISTS idx_task_instances_assigned_to ON task_instances(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_instances_due_date ON task_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_task_instances_status ON task_instances(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks(location_id);
CREATE INDEX IF NOT EXISTS idx_tasks_frequency ON tasks(frequency_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_user_id ON user_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);

-- Useful Views
CREATE VIEW IF NOT EXISTS v_upcoming_tasks AS
SELECT 
    ti.id as instance_id,
    t.id as task_id,
    t.name as task_name,
    ti.due_date,
    ti.due_time,
    u.name as assigned_to,
    l.name as location,
    c.name as category,
    ft.name as frequency,
    t.priority,
    t.estimated_duration,
    t.points_value
FROM task_instances ti
JOIN tasks t ON ti.task_id = t.id
JOIN users u ON ti.assigned_to = u.id
JOIN locations l ON t.location_id = l.id
JOIN categories c ON t.category_id = c.id
JOIN frequency_types ft ON t.frequency_id = ft.id
WHERE ti.status = 'pending'
ORDER BY ti.due_date, ti.due_time;

CREATE VIEW IF NOT EXISTS v_completed_tasks AS
SELECT 
    ti.id as instance_id,
    t.id as task_id,
    t.name as task_name,
    ti.completed_at,
    u1.name as assigned_to,
    u2.name as completed_by,
    ti.actual_duration,
    ti.rating,
    ti.points_earned,
    l.name as location,
    c.name as category
FROM task_instances ti
JOIN tasks t ON ti.task_id = t.id
JOIN users u1 ON ti.assigned_to = u1.id
JOIN users u2 ON ti.completed_by = u2.id
JOIN locations l ON t.location_id = l.id
JOIN categories c ON t.category_id = c.id
WHERE ti.status = 'completed'
ORDER BY ti.completed_at DESC;

CREATE VIEW IF NOT EXISTS v_user_points_summary AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.points_balance,
    (SELECT COUNT(*) FROM task_instances WHERE completed_by = u.id AND status = 'completed') as tasks_completed,
    (SELECT COUNT(*) FROM task_instances WHERE assigned_to = u.id AND status = 'pending') as tasks_pending,
    (SELECT AVG(rating) FROM task_instances WHERE completed_by = u.id AND rating IS NOT NULL) as avg_rating
FROM users u
WHERE u.is_active = TRUE;

CREATE VIEW IF NOT EXISTS v_supply_status AS
SELECT
    s.id as supply_id,
    s.name as supply_name,
    s.current_quantity,
    s.minimum_quantity,
    s.unit,
    l.name as location,
    CASE 
        WHEN s.current_quantity <= s.minimum_quantity THEN 'reorder'
        WHEN s.current_quantity <= s.minimum_quantity * 2 THEN 'low'
        ELSE 'ok'
    END as status,
    s.last_purchased,
    s.estimated_cost
FROM supplies s
LEFT JOIN locations l ON s.location_id = l.id
WHERE s.is_active = TRUE;

-- Triggers for Updated Timestamps
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp 
AFTER UPDATE ON tasks
BEGIN
    UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_task_instances_timestamp 
AFTER UPDATE ON task_instances
BEGIN
    UPDATE task_instances SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Add any additional indices based on common query patterns
-- Add any additional views based on common reporting needs