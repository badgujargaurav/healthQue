-- Ensure clinics have doctor_id and remove doctors.clinic_id
START TRANSACTION;
ALTER TABLE clinics ADD COLUMN doctor_id INT DEFAULT NULL;
CREATE INDEX idx_clinics_doctor_id ON clinics(doctor_id);

-- populate doctor_id by matching clinics.user_id to doctors.user_id
UPDATE clinics c JOIN doctors d ON c.user_id = d.user_id SET c.doctor_id = d.id WHERE c.doctor_id IS NULL;

-- also try matching by name pattern 'Clinic <doctor id>' (best-effort)
UPDATE clinics c JOIN doctors d ON c.name = CONCAT('Clinic ', d.id) SET c.doctor_id = d.id WHERE c.doctor_id IS NULL;

-- remove doctors.clinic_id now that clinics have doctor_id
ALTER TABLE doctors DROP COLUMN clinic_id;
COMMIT;
