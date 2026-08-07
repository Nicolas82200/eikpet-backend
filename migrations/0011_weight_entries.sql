-- Courbe de poids (V4) : historique du poids d'un animal dans le temps, distinct du
-- champ animals.current_weight_kg (edite manuellement sur le profil, non recalcule ici).

CREATE TABLE weight_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  animal_id INT UNSIGNED NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  recorded_date DATE NOT NULL,
  notes VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_weight_entries_animal (animal_id),
  CONSTRAINT fk_weight_entries_animal FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
