import { INestApplication } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { DATABASE_POOL } from '../../src/database/database.constants';

/** Extrait le user id (claim `sub`) d'un access token JWT sans verifier la signature. */
function decodeUserId(accessToken: string): number {
  const payload = accessToken.split('.')[1];
  const decoded = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as { sub: number };
  return decoded.sub;
}

/**
 * Active un abonnement premium pour l'utilisateur proprietaire de ce token, directement
 * en base (pas de webhook RevenueCat reel disponible en e2e). Utile pour tester les
 * fonctionnalites reservees a l'abonnement (documents, foyers multiples, animaux illimites...).
 */
export async function activatePremium(
  app: INestApplication,
  accessToken: string,
): Promise<void> {
  const pool = app.get<Pool>(DATABASE_POOL);
  const userId = decodeUserId(accessToken);
  const periodEnd = new Date(Date.now() + 365 * 86_400_000);
  await pool.query(
    `INSERT INTO subscriptions (user_id, status, product_id, current_period_end)
     VALUES (?, 'active', 'test_premium', ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       current_period_end = VALUES(current_period_end)`,
    [userId, periodEnd],
  );
}
