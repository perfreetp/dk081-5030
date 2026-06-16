-- 用户表
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'hr',
    real_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 员工信息表
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    id_card TEXT UNIQUE NOT NULL,
    phone TEXT,
    employee_type TEXT NOT NULL CHECK(employee_type IN ('resignation', 'transfer', 'remote')),
    current_insurance_city TEXT NOT NULL,
    target_insurance_city TEXT NOT NULL,
    insurance_stop_date DATE,
    has_received_benefits INTEGER DEFAULT 0,
    has_duplicate_payment INTEGER DEFAULT 0,
    has_unit_certificate INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    return_count INTEGER DEFAULT 0,
    task_id TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 校验结果表
CREATE TABLE validation_results (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    overall_pass INTEGER NOT NULL,
    name_result TEXT,
    id_card_result TEXT,
    current_city_result TEXT,
    target_city_result TEXT,
    stop_date_result TEXT,
    benefits_result TEXT,
    duplicate_result TEXT,
    certificate_result TEXT,
    validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 任务表
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    city TEXT NOT NULL,
    employee_count INTEGER DEFAULT 0,
    deadline DATE,
    status TEXT NOT NULL DEFAULT 'pending',
    progress REAL DEFAULT 0,
    materials_json TEXT,
    timeline_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 退回记录表
CREATE TABLE return_records (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    category TEXT NOT NULL,
    marked_by TEXT NOT NULL,
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id)
);

-- 文档表
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    employee_ids TEXT NOT NULL,
    task_id TEXT,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_target_city ON employees(target_insurance_city);
CREATE INDEX idx_employees_type ON employees(employee_type);
CREATE INDEX idx_employees_task_id ON employees(task_id);
CREATE INDEX idx_validation_employee_id ON validation_results(employee_id);
CREATE INDEX idx_tasks_city ON tasks(city);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_return_employee_id ON return_records(employee_id);
CREATE INDEX idx_return_category ON return_records(category);
CREATE INDEX idx_documents_type ON documents(type);

-- 插入初始用户 (密码: admin123)
INSERT INTO users (id, username, password_hash, role, real_name) VALUES 
('user_001', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', '系统管理员'),
('user_002', 'hr_user', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'hr', '人事专员');
