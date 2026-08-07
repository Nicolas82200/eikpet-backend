CREATE TABLE animal_behavioral_notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  animal_id INT UNSIGNED NOT NULL,
  note VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_animal_behavioral_notes_animal (animal_id),
  CONSTRAINT fk_animal_behavioral_notes_animal FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
