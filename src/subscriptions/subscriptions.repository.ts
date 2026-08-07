import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../database/database.constants';

export type SubscriptionStatus =
  'active' | 'grace_period' | 'canceled' | 'expired';

export interface Subscription {
  id: number;
  userId: number;
  status: SubscriptionStatus;
  productId: string | null;
  currentPeriodEnd: Date | null;
  updatedAt: Date;
}

// 'canceled' reste actif : l'utilisateur a desactive le renouvellement automatique mais
// conserve l'acces jusqu'a current_period_end (RevenueCat enverra un EXPIRATION a l'echeance).
const ACTIVE_STATUSES: SubscriptionStatus[] = [
  'active',
  'grace_period',
  'canceled',
];

@Injectable()
export class SubscriptionsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByUserId(userId: number): Promise<Subscription | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id, user_id AS userId, status, product_id AS productId,
              current_period_end AS currentPeriodEnd, updated_at AS updatedAt
       FROM subscriptions WHERE user_id = ?`,
      [userId],
    );
    return (rows[0] as Subscription) ?? null;
  }

  /** Vrai si au moins un membre du foyer a un abonnement actif (les benefices sont en cascade). */
  async householdHasActiveMember(householdId: number): Promise<boolean> {
    const placeholders = ACTIVE_STATUSES.map(() => '?').join(', ');
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT 1
       FROM household_members hm
       JOIN subscriptions s ON s.user_id = hm.user_id
       WHERE hm.household_id = ?
         AND s.status IN (${placeholders})
         AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
       LIMIT 1`,
      [householdId, ...ACTIVE_STATUSES],
    );
    return rows.length > 0;
  }

  async isUserActive(userId: number): Promise<boolean> {
    const placeholders = ACTIVE_STATUSES.map(() => '?').join(', ');
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT 1 FROM subscriptions
       WHERE user_id = ?
         AND status IN (${placeholders})
         AND (current_period_end IS NULL OR current_period_end > NOW())
       LIMIT 1`,
      [userId, ...ACTIVE_STATUSES],
    );
    return rows.length > 0;
  }

  async upsert(
    userId: number,
    status: SubscriptionStatus,
    productId: string | null,
    currentPeriodEnd: Date | null,
  ): Promise<void> {
    await this.pool.query<ResultSetHeader>(
      `INSERT INTO subscriptions (user_id, status, product_id, current_period_end)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         product_id = VALUES(product_id),
         current_period_end = VALUES(current_period_end)`,
      [userId, status, productId, currentPeriodEnd],
    );
  }

  async hasProcessedEvent(revenuecatEventId: string): Promise<boolean> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT 1 FROM subscription_webhook_events WHERE revenuecat_event_id = ? LIMIT 1',
      [revenuecatEventId],
    );
    return rows.length > 0;
  }

  async recordEvent(
    revenuecatEventId: string,
    userId: number | null,
    eventType: string,
    payload: unknown,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO subscription_webhook_events (revenuecat_event_id, user_id, event_type, payload)
       VALUES (?, ?, ?, ?)`,
      [revenuecatEventId, userId, eventType, JSON.stringify(payload)],
    );
  }
}
