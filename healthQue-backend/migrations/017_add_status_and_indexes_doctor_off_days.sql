-- Add status column and uniqueness constraints to doctor_off_days
-- Add status column if it does not exist (safe to re-run)
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'doctor_off_days' AND COLUMN_NAME = 'status'
);
SET @sql_stmt = IF(@col_exists = 0, "ALTER TABLE doctor_off_days ADD COLUMN status ENUM('off','working') NOT NULL DEFAULT 'working'", 'SELECT 1');
PREPARE _stmt FROM @sql_stmt;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

-- Indexes are created in a follow-up migration after deduplication.
