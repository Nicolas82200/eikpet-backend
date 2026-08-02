-- 3.6 Repertoire des intervenants (V2) : veto, osteo, marechal, pension, toiletteur, educateur...
-- V1 (ici) : liste simple par foyer. V3 ajoutera la geolocalisation (cf. cahier des charges).

CREATE TABLE providers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  household_id INT UNSIGNED NOT NULL,
  type ENUM('veto', 'osteo', 'marechal', 'pension', 'toiletteur', 'educateur', 'autre') NOT NULL,
  custom_type_label VARCHAR(100) NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  address VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_providers_household (household_id),
  CONSTRAINT fk_providers_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
