-- Systeme d'abonnement (gratuit / premium). L'abonnement est rattache a un utilisateur
-- (achat in-app RevenueCat lie a un compte App Store/Play Store, pas a un foyer) mais ses
-- avantages s'appliquent en cascade a tous les foyers dont il est membre.

CREATE TABLE subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  status ENUM('active', 'grace_period', 'canceled', 'expired') NOT NULL DEFAULT 'expired',
  product_id VARCHAR(100) NULL,
  current_period_end DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Journal des evenements webhook RevenueCat : idempotence (RevenueCat peut renvoyer
-- le meme evenement plusieurs fois) et audit.
CREATE TABLE subscription_webhook_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  revenuecat_event_id VARCHAR(150) NOT NULL UNIQUE,
  user_id INT UNSIGNED NULL,
  event_type VARCHAR(50) NOT NULL,
  payload JSON NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_subscription_webhook_events_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
