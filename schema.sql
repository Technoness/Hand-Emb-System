-- ====================================================================
-- HAND EMBROIDERY DEPARTMENT (H-EMB) PRODUCTION & INVENTORY MANAGEMENT
-- PostgreSQL Schema for Neon Serverless Database
-- ====================================================================

-- 1. Contractors Master Table
CREATE TABLE IF NOT EXISTS contractors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Inventory (Aggregated Summary per Style Code + Category)
CREATE TABLE IF NOT EXISTS master_inventory (
    id SERIAL PRIMARY KEY,
    sr_no INT,
    style_code VARCHAR(100) NOT NULL,
    ship VARCHAR(50) DEFAULT '',
    category VARCHAR(50) NOT NULL,
    cut_qty INT NOT NULL DEFAULT 0,
    
    -- Receiving Summary
    received_qty INT NOT NULL DEFAULT 0,
    balance_from_stock INT GENERATED ALWAYS AS (cut_qty - received_qty) STORED,
    date_receive VARCHAR(255),
    challan_rec VARCHAR(255),
    
    -- Dispatch Summary
    dispatch_from_hemb INT NOT NULL DEFAULT 0,
    balance_from_hemb INT GENERATED ALWAYS AS (received_qty - dispatch_from_hemb) STORED,
    total_balance INT GENERATED ALWAYS AS (cut_qty - dispatch_from_hemb) STORED,
    date_dispatch VARCHAR(255),
    challan_dis VARCHAR(255),
    
    -- Contractor & Remarks
    contractor_name VARCHAR(100),
    status VARCHAR(30) DEFAULT 'In Progress',
    remarks TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite unique key on (style_code, category)
    CONSTRAINT uq_style_category UNIQUE (style_code, category)
);

-- 3. Individual Receiving Log (Every receiving challan entry saved on a new line)
CREATE TABLE IF NOT EXISTS receiving_log (
    id SERIAL PRIMARY KEY,
    sr_no INT,
    style_code VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    contractor_name VARCHAR(100),
    cut_qty INT DEFAULT 0,
    received_qty INT NOT NULL DEFAULT 0,
    date_receive VARCHAR(100) NOT NULL,
    challan_rec VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Individual Dispatch Log (Every dispatch challan entry saved on a new line)
CREATE TABLE IF NOT EXISTS dispatch_log (
    id SERIAL PRIMARY KEY,
    sr_no INT,
    style_code VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    contractor_name VARCHAR(100),
    dispatch_qty INT NOT NULL DEFAULT 0,
    date_dispatch VARCHAR(100) NOT NULL,
    challan_dis VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Daily Final Style Report
CREATE TABLE IF NOT EXISTS final_style_report (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    serial_no INT NOT NULL,
    style_code VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    contractor_name VARCHAR(100),
    cut_qty INT DEFAULT 0,
    received_qty INT DEFAULT 0,
    balance_from_stock INT DEFAULT 0,
    balance_from_hemb INT DEFAULT 0,
    time_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Application Users & Role-Based Access Control
CREATE TABLE IF NOT EXISTS app_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(30) DEFAULT 'Operator',
    permissions JSONB,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ultra fast lookup by Style Code + Category & Users
CREATE INDEX IF NOT EXISTS idx_master_style_cat ON master_inventory(style_code, category);
CREATE INDEX IF NOT EXISTS idx_rec_style_cat ON receiving_log(style_code, category);
CREATE INDEX IF NOT EXISTS idx_dis_style_cat ON dispatch_log(style_code, category);
CREATE INDEX IF NOT EXISTS idx_master_cont ON master_inventory(contractor_name);
CREATE INDEX IF NOT EXISTS idx_users_username ON app_users(username);
