ALTER TABLE boarding_entries
  ADD COLUMN start_date DATE NULL AFTER due_date,
  ADD COLUMN day_of_month TINYINT UNSIGNED NULL AFTER start_date,
  ADD COLUMN recurrence_month TINYINT UNSIGNED NULL AFTER day_of_month,
  ADD COLUMN recurrence_day TINYINT UNSIGNED NULL AFTER recurrence_month,
  ADD COLUMN day_of_week TINYINT UNSIGNED NULL AFTER recurrence_day;
