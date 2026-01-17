-- Add admin fields: active flag and trial_expires_at to users; billing_terms table
ALTER TABLE users ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN trial_expires_at DATETIME NULL;

-- Simple billing_terms table to record agreement per doctor
CREATE TABLE IF NOT EXISTS billing_terms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_user_id INT NOT NULL,
  type ENUM('fixed','percentage') NOT NULL DEFAULT 'fixed',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  interval ENUM('monthly','quarterly','halfyearly','yearly') NOT NULL DEFAULT 'monthly',
  patients_estimate INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_billing_doctor FOREIGN KEY (doctor_user_id) REFERENCES users(id) ON DELETE CASCADE
);
