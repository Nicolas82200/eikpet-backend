-- 3.8 Seances (chevaux) : planning des seances prevues/faites (dressage, osteo, entrainement...)
-- avec compte-rendu par seance. Meme structure que health_entries/boarding_entries.

CREATE TABLE riding_sessions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  animal_id INT UNSIGNED NOT NULL,
  type ENUM('dressage', 'osteo', 'entrainement', 'autre') NOT NULL,
  custom_type_label VARCHAR(100) NULL,
  scheduled_date DATE NOT NULL,
  status ENUM('prevu', 'fait') NOT NULL DEFAULT 'prevu',
  report TEXT NULL,
  price DECIMAL(10,2) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_riding_sessions_animal (animal_id),
  CONSTRAINT fk_riding_sessions_animal FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
