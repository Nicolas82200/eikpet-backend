ALTER TABLE animal_surgical_history
  ADD COLUMN performed_year SMALLINT UNSIGNED NULL AFTER performed_on,
  ADD COLUMN performed_month TINYINT UNSIGNED NULL AFTER performed_year,
  ADD COLUMN performed_day TINYINT UNSIGNED NULL AFTER performed_month;
