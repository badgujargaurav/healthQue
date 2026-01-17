-- Add 'staff' to users.role enum
ALTER TABLE users MODIFY COLUMN role ENUM('doctor','patient','admin','staff') NOT NULL DEFAULT 'doctor';
