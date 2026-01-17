-- Create doctor_off_days table for scheduled and emergency off days
CREATE TABLE IF NOT EXISTS doctor_off_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE DEFAULT NULL,
  is_recurring_weekly TINYINT(1) DEFAULT 0,
  day_of_week TINYINT(1) DEFAULT NULL,
  type ENUM('scheduled','emergency') NOT NULL DEFAULT 'scheduled',
  reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_offdays_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);
