-- Lie des intervenants du repertoire (3.6) a des animaux precis : un meme intervenant
-- (ex: le veto du foyer) peut etre associe a plusieurs animaux, et un animal peut avoir
-- plusieurs intervenants (veto, osteo, marechal...).

CREATE TABLE animal_providers (
  animal_id INT UNSIGNED NOT NULL,
  provider_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (animal_id, provider_id),
  CONSTRAINT fk_animal_providers_animal FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE,
  CONSTRAINT fk_animal_providers_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
