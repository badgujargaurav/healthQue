-- Migrate clinic_schedule from doctors into clinics, and set doctors.clinic_id when possible
START TRANSACTION;

-- Insert clinics for doctors that have clinic_schedule and not already linked via clinic_id
INSERT INTO clinics (user_id, tenant_id, name, location, schedule, created_at)
SELECT d.user_id, d.tenant_id, CONCAT('Clinic ', d.id), COALESCE(d.clinic_location, d.clinic_address), d.clinic_schedule, NOW()
FROM doctors d
WHERE d.clinic_schedule IS NOT NULL
  AND (d.clinic_id IS NULL OR d.clinic_id = 0);

-- Link inserted clinics back to doctors by matching user_id and the generated name
UPDATE doctors dd
JOIN clinics c ON c.user_id = dd.user_id AND c.name = CONCAT('Clinic ', dd.id)
SET dd.clinic_id = c.id
WHERE dd.clinic_schedule IS NOT NULL;

-- Drop the old clinic_schedule column from doctors if present
ALTER TABLE doctors DROP COLUMN IF EXISTS clinic_schedule;

COMMIT;
