-- Remove duplicate off-day rows and create unique indexes
-- Delete duplicate non-recurring rows (keep lowest id)
DELETE d1 FROM doctor_off_days d1
INNER JOIN doctor_off_days d2
  ON d1.doctor_id = d2.doctor_id
  AND d1.start_date = d2.start_date
  AND d1.is_recurring_weekly = d2.is_recurring_weekly
  AND d1.is_recurring_weekly = 0
  AND d1.id > d2.id;

-- Delete duplicate recurring rows (keep lowest id)
DELETE d1 FROM doctor_off_days d1
INNER JOIN doctor_off_days d2
  ON d1.doctor_id = d2.doctor_id
  AND d1.day_of_week = d2.day_of_week
  AND d1.is_recurring_weekly = d2.is_recurring_weekly
  AND d1.is_recurring_weekly = 1
  AND d1.id > d2.id;

-- Create unique indexes to enforce one entry per doctor/date and per doctor/weekday
CREATE UNIQUE INDEX ux_doctor_off_days_nonrec ON doctor_off_days (doctor_id, start_date, is_recurring_weekly);
CREATE UNIQUE INDEX ux_doctor_off_days_rec ON doctor_off_days (doctor_id, day_of_week, is_recurring_weekly);
