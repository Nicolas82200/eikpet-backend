-- 3.5 Pension / hebergement (chevaux et autres)
-- Chaque echeance de pension (nom, adresse, prix, periodicite, statut regle/non regle) :
-- l'historique des paiements correspond simplement a la liste de ces echeances,
-- comme pour le carnet de sante (health_entries).

CREATE TABLE boarding_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  animal_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NULL,
  price DECIMAL(10,2) NULL,
  periodicity ENUM('unique', 'hebdomadaire', 'mensuel', 'annuel') NOT NULL DEFAULT 'unique',
  due_date DATE NOT NULL,
  status ENUM('regle', 'non_regle') NOT NULL DEFAULT 'non_regle',
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_boarding_entries_animal (animal_id),
  KEY idx_boarding_entries_due_date (due_date),
  CONSTRAINT fk_boarding_entries_animal FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
