-- Create clinics table to store clinics per doctor
CREATE TABLE IF NOT EXISTS clinics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tenant_id INT DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) DEFAULT NULL,
  schedule TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id),
  INDEX (tenant_id)
);
