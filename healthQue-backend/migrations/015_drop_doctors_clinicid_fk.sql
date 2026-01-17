-- Drop foreign key constraint on doctors.clinic_id and remove the column
START TRANSACTION;
ALTER TABLE doctors DROP FOREIGN KEY doctors_ibfk_2;
ALTER TABLE doctors DROP COLUMN clinic_id;
COMMIT;
