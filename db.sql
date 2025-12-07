-- Create database
CREATE DATABASE healthque;
USE healthque;

-- Users table (patients, doctors, receptionists, admins)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    full_name VARCHAR(255) NOT NULL,
    role ENUM('patient', 'doctor', 'receptionist', 'admin') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Clinics table
CREATE TABLE clinics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors table
CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    clinic_id INT,
    specialty VARCHAR(100),
    consultation_duration_minutes INT DEFAULT 30,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL
);

-- Doctor availability (working hours)
CREATE TABLE doctor_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week TINYINT(1) NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_schedule (doctor_id, day_of_week, start_time, end_time)
);

-- Appointments table (core business table)
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    clinic_id INT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    reason_for_visit TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL,
    UNIQUE KEY unique_appointment (doctor_id, appointment_date, appointment_time)
);

-- Indexes for performance
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_doctors_specialty ON doctors(specialty);
------------------------------------------------------------------------

-- 1. Get available slots for doctor (next 7 days)
SELECT 
    DATE_ADD(CURDATE(), INTERVAL n DAY) as date,
    SEC_TO_TIME(TIME_TO_SEC(start_time) + (TIME_TO_SEC(end_time) - TIME_TO_SEC(start_time)) * (slot_num / total_slots)) as slot_time
FROM doctor_availability da
CROSS JOIN (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) days
LEFT JOIN appointments a ON a.doctor_id = da.doctor_id 
    AND a.appointment_date = DATE_ADD(CURDATE(), INTERVAL n DAY)
    AND a.appointment_time = slot_time
    AND a.status != 'cancelled'
WHERE da.doctor_id = ? AND da.day_of_week = DAYOFWEEK(DATE_ADD(CURDATE(), INTERVAL n DAY)) - 1
AND da.is_active = TRUE
AND a.id IS NULL
ORDER BY date, slot_time
LIMIT 20;

-- 2. Doctor's today appointments
SELECT a.*, u.full_name as patient_name 
FROM appointments a
JOIN users u ON u.id = a.patient_id
WHERE a.doctor_id = ? AND a.appointment_date = CURDATE()
ORDER BY a.appointment_time;

-- 3. Create appointment
INSERT INTO appointments (patient_id, doctor_id, clinic_id, appointment_date, appointment_time, status, reason_for_visit)
VALUES (?, ?, ?, ?, ?, 'scheduled', ?);

-- 4. Update appointment status
UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;

------------------------------------------------------------
-- Export schema anytime (File → Export → Forward Engineer)
-- Import sample data with one click (Server → Data Import)

-- Connection string for Node.js:
-- mysql://root:healthque123@127.0.0.1:3306/healthque
