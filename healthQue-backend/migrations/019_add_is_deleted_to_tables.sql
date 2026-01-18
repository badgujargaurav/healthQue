-- Add `is_deleted` column to core tables if missing
-- This migration is idempotent and safe to re-run

SET @tbl = '';

-- tenants
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'is_deleted');
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE tenants ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0", 'SELECT 1');
PREPARE _stmt FROM @sql_stmt; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- users
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_deleted');
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE users ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0", 'SELECT 1');
PREPARE _stmt FROM @sql_stmt; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- doctors
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'doctors' AND COLUMN_NAME = 'is_deleted');
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE doctors ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0", 'SELECT 1');
PREPARE _stmt FROM @sql_stmt; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- sessions
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessions' AND COLUMN_NAME = 'is_deleted');
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE sessions ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0", 'SELECT 1');
PREPARE _stmt FROM @sql_stmt; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- patients
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'is_deleted');
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE patients ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0", 'SELECT 1');
PREPARE _stmt FROM @sql_stmt; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- appointments
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'is_deleted');
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE appointments ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0", 'SELECT 1');
PREPARE _stmt FROM @sql_stmt; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- clinics
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clinics' AND COLUMN_NAME = 'is_deleted');
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE clinics ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0", 'SELECT 1');
PREPARE _stmt FROM @sql_stmt; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- doctor_off_days
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'doctor_off_days' AND COLUMN_NAME = 'is_deleted');
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE doctor_off_days ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0", 'SELECT 1');
PREPARE _stmt FROM @sql_stmt; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- doctor_availability (present in DB on some installs)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'doctor_availability' AND COLUMN_NAME = 'is_deleted');
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE doctor_availability ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0", 'SELECT 1');
PREPARE _stmt FROM @sql_stmt; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- doctor_off_days_test (test table sometimes present)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'doctor_off_days_test' AND COLUMN_NAME = 'is_deleted');
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE doctor_off_days_test ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0", 'SELECT 1');
PREPARE _stmt FROM @sql_stmt; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- migrations table (internal, include for completeness)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'migrations' AND COLUMN_NAME = 'is_deleted');
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE migrations ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0", 'SELECT 1');
PREPARE _stmt FROM @sql_stmt; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- end
