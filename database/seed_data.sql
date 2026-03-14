-- BusCare Fleet Compliance Platform - Seed Data
-- Demo data for testing and initial setup
-- Version: 1.0.0

USE buscare;

-- ============================================
-- SEED CLIENTS
-- ============================================
INSERT INTO clients (client_id, company_name, logo, theme_color, alert_days, active, created_date) VALUES
('demo-client-001', 'Demo Transport Company', NULL, '#1E3A8A', 7, TRUE, NOW()),
('platform', 'BusCare Platform', NULL, '#1E3A8A', 7, TRUE, NOW())
ON DUPLICATE KEY UPDATE company_name = VALUES(company_name);

-- ============================================
-- SEED USERS (Passwords are bcrypt hashed)
-- Default passwords: platform123, admin123, super123, driver123, mech123
-- ============================================

-- Platform Admin (platform123)
INSERT INTO users (user_id, email, password, name, role, client_id, active, preferred_language, created_date) VALUES
(UUID(), 'platform@admin.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VQ/mGJYmKqC.C.G', 'Platform Admin', 'PLATFORM_ADMIN', 'demo-client-001', TRUE, 'EN', NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Admin User (admin123)
INSERT INTO users (user_id, email, password, name, role, client_id, active, preferred_language, created_date) VALUES
(UUID(), 'admin@demo.com', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'ADMIN', 'demo-client-001', TRUE, 'EN', NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Supervisor User (super123)
INSERT INTO users (user_id, email, password, name, role, client_id, active, preferred_language, created_date) VALUES
(UUID(), 'supervisor@demo.com', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Supervisor User', 'SUPERVISOR', 'demo-client-001', TRUE, 'EN', NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Driver User (driver123)
INSERT INTO users (user_id, email, password, name, role, client_id, active, preferred_language, created_date) VALUES
(UUID(), 'driver@demo.com', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Driver One', 'DRIVER', 'demo-client-001', TRUE, 'EN', NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Mechanic User (mech123)
INSERT INTO users (user_id, email, password, name, role, client_id, active, preferred_language, created_date) VALUES
(UUID(), 'mechanic@demo.com', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mechanic One', 'MECHANIC', 'demo-client-001', TRUE, 'EN', NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================
-- SEED BUSES
-- ============================================
INSERT INTO buses (bus_id, bus_number, registration_number, model, capacity, client_id, active, created_date) VALUES
(UUID(), 'TN-01-AB-1234', 'TN01AB1234', 'Ashok Leyland', 50, 'demo-client-001', TRUE, NOW()),
(UUID(), 'TN-01-CD-5678', 'TN01CD5678', 'Tata Motors', 45, 'demo-client-001', TRUE, NOW()),
(UUID(), 'KA-08-AB-1001', 'KA08AB1001', 'TATA', 50, 'demo-client-001', TRUE, NOW())
ON DUPLICATE KEY UPDATE bus_number = VALUES(bus_number);

-- ============================================
-- SEED CHECKLIST QUESTIONS
-- ============================================
INSERT INTO checklist_questions (question_id, question_text, question_type, order_num, is_critical, is_active, client_id, created_date) VALUES
(UUID(), 'Check tire pressure', 'PASS_FAIL', 1, TRUE, TRUE, 'demo-client-001', NOW()),
(UUID(), 'Check engine oil level', 'PASS_FAIL', 2, FALSE, TRUE, 'demo-client-001', NOW()),
(UUID(), 'Check brake condition', 'PASS_FAIL', 3, TRUE, TRUE, 'demo-client-001', NOW()),
(UUID(), 'Check headlights and indicators', 'PASS_FAIL', 4, FALSE, TRUE, 'demo-client-001', NOW()),
(UUID(), 'Check windshield wipers', 'PASS_FAIL', 5, FALSE, TRUE, 'demo-client-001', NOW()),
(UUID(), 'Odometer reading', 'NUMBER', 6, FALSE, TRUE, 'demo-client-001', NOW()),
(UUID(), 'Fuel level (%)', 'NUMBER', 7, FALSE, TRUE, 'demo-client-001', NOW()),
(UUID(), 'Check seat belts', 'PASS_FAIL', 8, TRUE, TRUE, 'demo-client-001', NOW()),
(UUID(), 'Check emergency exits', 'PASS_FAIL', 9, TRUE, TRUE, 'demo-client-001', NOW()),
(UUID(), 'Check first aid kit', 'PASS_FAIL', 10, FALSE, TRUE, 'demo-client-001', NOW())
ON DUPLICATE KEY UPDATE question_text = VALUES(question_text);

-- ============================================
-- SEED EXPENSE MASTER (CATEGORIES)
-- ============================================
INSERT INTO expense_master (expense_id, expense_name, client_id, active_flag, created_date) VALUES
(UUID(), 'Fuel', 'demo-client-001', TRUE, NOW()),
(UUID(), 'Toll', 'demo-client-001', TRUE, NOW()),
(UUID(), 'Driver Salary', 'demo-client-001', TRUE, NOW()),
(UUID(), 'Cleaning', 'demo-client-001', TRUE, NOW()),
(UUID(), 'Maintenance', 'demo-client-001', TRUE, NOW()),
(UUID(), 'Parking', 'demo-client-001', TRUE, NOW()),
(UUID(), 'Insurance', 'demo-client-001', TRUE, NOW()),
(UUID(), 'Permit Fees', 'demo-client-001', TRUE, NOW())
ON DUPLICATE KEY UPDATE expense_name = VALUES(expense_name);

-- ============================================
-- SEED ALERT CONFIGURATIONS
-- ============================================
INSERT INTO alert_configurations (alert_config_id, client_id, alert_name, trigger_condition, is_active, created_date) VALUES
(UUID(), 'demo-client-001', 'Insurance Expiry', 'Notify 30 days before insurance expiry', TRUE, NOW()),
(UUID(), 'demo-client-001', 'Permit Renewal', 'Notify 15 days before permit expiry', TRUE, NOW()),
(UUID(), 'demo-client-001', 'Fitness Certificate', 'Notify 7 days before fitness certificate expiry', TRUE, NOW()),
(UUID(), 'demo-client-001', 'Pollution Check', 'Notify 7 days before pollution certificate expiry', TRUE, NOW())
ON DUPLICATE KEY UPDATE alert_name = VALUES(alert_name);

-- ============================================
-- END OF SEED DATA
-- ============================================

SELECT 'Seed data inserted successfully!' AS Status;
