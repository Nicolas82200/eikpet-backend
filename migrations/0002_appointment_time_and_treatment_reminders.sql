-- Heure de rendez-vous (en plus de la date) et rappels de traitement configurables
-- (matin/midi/soir, pendant X jours) geres cote mobile via notifications locales.

ALTER TABLE health_entries
  ADD COLUMN scheduled_time TIME NULL AFTER scheduled_date;

ALTER TABLE animal_treatments
  ADD COLUMN reminder_times VARCHAR(100) NULL COMMENT 'Heures separees par des virgules, ex: 08:00,13:00,20:00' AFTER frequency;
