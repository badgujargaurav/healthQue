-- Add doctor_id to clinics so a doctor can own multiple clinics
START TRANSACTION;

-- add column doctor_id if it does not exist (compatible with older MySQL versions)
SET @col_exists = (
	SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clinics' AND COLUMN_NAME = 'doctor_id'
);
SET @sql = IF(@col_exists = 0, 'ALTER TABLE clinics ADD COLUMN doctor_id INT DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- create index if missing
SET @idx_exists = (
	SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clinics' AND INDEX_NAME = 'idx_clinics_doctor_id'
);
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_clinics_doctor_id ON clinics(doctor_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- populate doctor_id by matching clinics.user_id to doctors.user_id (only set when NULL)
UPDATE clinics c JOIN doctors d ON c.user_id = d.user_id SET c.doctor_id = d.id WHERE c.doctor_id IS NULL;

-- drop doctors.clinic_id if it exists
SET @col_exists2 = (
	SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'doctors' AND COLUMN_NAME = 'clinic_id'
);
SET @sql = IF(@col_exists2 > 0, 'ALTER TABLE doctors DROP COLUMN clinic_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

COMMIT;
