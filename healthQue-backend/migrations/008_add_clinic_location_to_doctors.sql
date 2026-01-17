-- Add clinic_location to doctors to store textual clinic location (city/address)
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS clinic_location VARCHAR(255) DEFAULT NULL;
