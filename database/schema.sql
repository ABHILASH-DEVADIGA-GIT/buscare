-- BusCare Fleet Compliance Platform - Database Schema
-- MySQL/MariaDB Database Setup Script
-- Version: 1.0.0
-- Date: March 2026

-- Create database
CREATE DATABASE IF NOT EXISTS buscare 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE buscare;

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(100) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    logo TEXT,
    theme_color VARCHAR(20) DEFAULT '#1E3A8A',
    alert_days INT DEFAULT 7,
    active BOOLEAN DEFAULT TRUE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME,
    INDEX idx_client_id (client_id),
    INDEX idx_active (active)
) ENGINE=InnoDB;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('PLATFORM_ADMIN', 'ADMIN', 'SUPERVISOR', 'DRIVER', 'MECHANIC') NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    preferred_language VARCHAR(10) DEFAULT 'EN',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_email_client (email, client_id),
    INDEX idx_client_id (client_id),
    INDEX idx_role (role),
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- BUSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS buses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bus_id VARCHAR(100) UNIQUE NOT NULL,
    bus_number VARCHAR(50) NOT NULL,
    registration_number VARCHAR(50),
    model VARCHAR(100),
    capacity INT,
    client_id VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    INDEX idx_bus_id (bus_id),
    INDEX idx_client_id (client_id),
    INDEX idx_bus_number (bus_number),
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- CHECKLIST QUESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS checklist_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id VARCHAR(100) UNIQUE NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('PASS_FAIL', 'NUMBER', 'TEXT', 'YES_NO', 'ODO') DEFAULT 'PASS_FAIL',
    order_num INT DEFAULT 0,
    is_critical BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    client_id VARCHAR(100) NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    INDEX idx_question_id (question_id),
    INDEX idx_client_id (client_id),
    INDEX idx_order (order_num),
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- INSPECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inspections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_id VARCHAR(100) UNIQUE NOT NULL,
    bus_id VARCHAR(100) NOT NULL,
    bus_number VARCHAR(50),
    driver_id VARCHAR(100),
    driver_name VARCHAR(255),
    inspection_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    inspection_status ENUM('PASSED', 'FAILED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'FIXED') DEFAULT 'PASSED',
    client_id VARCHAR(100) NOT NULL,
    assigned_mechanic VARCHAR(100),
    mechanic_name VARCHAR(255),
    assigned_date DATETIME,
    assigned_by VARCHAR(100),
    resolved_date DATETIME,
    resolved_by VARCHAR(100),
    verified_date DATETIME,
    verified_by VARCHAR(100),
    is_custom_problem BOOLEAN DEFAULT FALSE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_inspection_id (inspection_id),
    INDEX idx_bus_id (bus_id),
    INDEX idx_client_id (client_id),
    INDEX idx_status (inspection_status),
    INDEX idx_date (inspection_date),
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
    FOREIGN KEY (bus_id) REFERENCES buses(bus_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- INSPECTION DETAILS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inspection_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    detail_id VARCHAR(100) UNIQUE NOT NULL,
    inspection_id VARCHAR(100) NOT NULL,
    question_id VARCHAR(100),
    question_text TEXT,
    question_type VARCHAR(50),
    answer VARCHAR(255),
    comment TEXT,
    image_url LONGTEXT,
    audio_url LONGTEXT,
    video_url LONGTEXT,
    status ENUM('PASSED', 'FAILED', 'FIXED', 'ASSIGNED') DEFAULT 'PASSED',
    fixed_by VARCHAR(100),
    fixed_date DATETIME,
    fix_notes TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_detail_id (detail_id),
    INDEX idx_inspection_id (inspection_id),
    INDEX idx_status (status),
    FOREIGN KEY (inspection_id) REFERENCES inspections(inspection_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- FEEDBACK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feedback_id VARCHAR(100) UNIQUE NOT NULL,
    bus_id VARCHAR(100) NOT NULL,
    bus_number VARCHAR(50),
    client_id VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    image_url LONGTEXT,
    status ENUM('NEW', 'REVIEWED', 'RESOLVED') DEFAULT 'NEW',
    want_update BOOLEAN DEFAULT FALSE,
    email VARCHAR(255),
    resolved_date DATETIME,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_feedback_id (feedback_id),
    INDEX idx_bus_id (bus_id),
    INDEX idx_client_id (client_id),
    INDEX idx_status (status),
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_id VARCHAR(100) UNIQUE NOT NULL,
    bus_id VARCHAR(100) NOT NULL,
    alert_type ENUM('INSURANCE', 'PERMIT', 'FITNESS', 'POLLUTION', 'OIL_CHANGE', 'CUSTOM') NOT NULL,
    alert_name VARCHAR(255) NOT NULL,
    expiry_date DATETIME NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    status ENUM('VALID', 'UPCOMING', 'EXPIRED') DEFAULT 'VALID',
    days_remaining INT,
    notes TEXT,
    attachment_url TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_date DATETIME,
    updated_by VARCHAR(100),
    INDEX idx_alert_id (alert_id),
    INDEX idx_bus_id (bus_id),
    INDEX idx_client_id (client_id),
    INDEX idx_status (status),
    INDEX idx_expiry (expiry_date),
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- COLLECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    collection_id VARCHAR(100) UNIQUE NOT NULL,
    date VARCHAR(20) NOT NULL,
    bus_id VARCHAR(100) NOT NULL,
    bus_number VARCHAR(50),
    collected_amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    client_id VARCHAR(100) NOT NULL,
    created_by VARCHAR(100),
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_collection_id (collection_id),
    INDEX idx_bus_id (bus_id),
    INDEX idx_client_id (client_id),
    INDEX idx_date (date),
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- EXPENSE MASTER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expense_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_id VARCHAR(100) UNIQUE NOT NULL,
    expense_name VARCHAR(255) NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    active_flag BOOLEAN DEFAULT TRUE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    INDEX idx_expense_id (expense_id),
    INDEX idx_client_id (client_id),
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_entry_id VARCHAR(100) UNIQUE NOT NULL,
    date VARCHAR(20) NOT NULL,
    bus_id VARCHAR(100) NOT NULL,
    bus_number VARCHAR(50),
    expense_id VARCHAR(100),
    expense_name VARCHAR(255),
    amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    client_id VARCHAR(100) NOT NULL,
    created_by VARCHAR(100),
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_expense_entry_id (expense_entry_id),
    INDEX idx_bus_id (bus_id),
    INDEX idx_client_id (client_id),
    INDEX idx_date (date),
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- ALERT CONFIGURATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alert_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_config_id VARCHAR(100) UNIQUE NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    alert_name VARCHAR(255) NOT NULL,
    trigger_condition TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    INDEX idx_alert_config_id (alert_config_id),
    INDEX idx_client_id (client_id),
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- NOTIFICATION LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notification_id VARCHAR(100) UNIQUE NOT NULL,
    notification_type VARCHAR(50),
    recipient_email VARCHAR(255),
    subject VARCHAR(255),
    body TEXT,
    status VARCHAR(50),
    client_id VARCHAR(100),
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notification_id (notification_id),
    INDEX idx_client_id (client_id)
) ENGINE=InnoDB;

-- ============================================
-- END OF SCHEMA
-- ============================================
