-- EikPet V1 — schema initial
-- Modules : auth/foyers, profils animaux, fiche medicale/antecedents,
--           carnet de sante, calendrier/rappels, notifications push, documents

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE households (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  invite_code CHAR(8) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE household_members (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  household_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  role ENUM('owner', 'member') NOT NULL DEFAULT 'member',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_household_user (household_id, user_id),
  CONSTRAINT fk_household_members_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  CONSTRAINT fk_household_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE refresh_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_refresh_tokens_user (user_id),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE push_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  fcm_token VARCHAR(255) NOT NULL UNIQUE,
  device_info VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_push_tokens_user (user_id),
  CONSTRAINT fk_push_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3.1 Profil animal (identite)
CREATE TABLE animals (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  household_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(100) NULL,
  color VARCHAR(100) NULL,
  sex ENUM('male', 'femelle', 'inconnu') NOT NULL DEFAULT 'inconnu',
  birth_date DATE NULL,
  sterilized BOOLEAN NOT NULL DEFAULT FALSE,
  microchip_number VARCHAR(50) NULL,
  current_weight_kg DECIMAL(6,2) NULL,
  photo_url VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_animals_household (household_id),
  CONSTRAINT fk_animals_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3.2 Fiche medicale - antecedents
CREATE TABLE animal_medical_profiles (
  animal_id INT UNSIGNED PRIMARY KEY,
  chronic_conditions TEXT NULL,
  allergies TEXT NULL,
  dietary_needs TEXT NULL,
  behavioral_notes TEXT NULL,
  blood_type VARCHAR(50) NULL,
  insurance_provider VARCHAR(150) NULL,
  insurance_policy_number VARCHAR(100) NULL,
  insurance_coverage_limit DECIMAL(10,2) NULL,
  insurance_deductible DECIMAL(10,2) NULL,
  referring_vet_name VARCHAR(150) NULL,
  referring_vet_phone VARCHAR(50) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_medical_profiles_animal FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE animal_treatments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  animal_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  dosage VARCHAR(100) NULL,
  frequency VARCHAR(100) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_animal_treatments_animal (animal_id),
  CONSTRAINT fk_animal_treatments_animal FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE animal_surgical_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  animal_id INT UNSIGNED NOT NULL,
  procedure_name VARCHAR(150) NOT NULL,
  performed_on DATE NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_animal_surgical_history_animal (animal_id),
  CONSTRAINT fk_animal_surgical_history_animal FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3.3 Carnet de sante
CREATE TABLE health_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  animal_id INT UNSIGNED NOT NULL,
  type ENUM('vaccin', 'vermifuge', 'rdv_veto', 'osteo', 'dentiste_equin', 'marechal', 'autre') NOT NULL,
  custom_type_label VARCHAR(100) NULL,
  scheduled_date DATE NOT NULL,
  status ENUM('prevu', 'fait') NOT NULL DEFAULT 'prevu',
  report TEXT NULL,
  price DECIMAL(10,2) NULL,
  next_reminder_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_health_entries_animal (animal_id),
  KEY idx_health_entries_next_reminder (next_reminder_date),
  CONSTRAINT fk_health_entries_animal FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3.4 Calendrier & rappels : suivi des notifications push envoyees (J-7 / J-1 / jour J)
CREATE TABLE reminder_notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  health_entry_id INT UNSIGNED NOT NULL,
  offset_days TINYINT NOT NULL COMMENT '7, 1 ou 0 (jour J)',
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reminder_notification (health_entry_id, offset_days),
  CONSTRAINT fk_reminder_notifications_entry FOREIGN KEY (health_entry_id) REFERENCES health_entries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Gestion documents (ordonnances, analyses, certificats scannes)
CREATE TABLE documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  household_id INT UNSIGNED NOT NULL,
  animal_id INT UNSIGNED NULL,
  uploaded_by_user_id INT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  category ENUM('ordonnance', 'analyse', 'certificat_vaccination', 'autre') NOT NULL DEFAULT 'autre',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_documents_household (household_id),
  KEY idx_documents_animal (animal_id),
  CONSTRAINT fk_documents_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_animal FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
