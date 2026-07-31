import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { DATABASE_POOL } from '../database/database.constants';

@Injectable()
export class PushTokensRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async register(
    userId: number,
    fcmToken: string,
    deviceInfo?: string | null,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO push_tokens (user_id, fcm_token, device_info) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), device_info = VALUES(device_info)`,
      [userId, fcmToken, deviceInfo ?? null],
    );
  }

  async unregister(userId: number, fcmToken: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM push_tokens WHERE user_id = ? AND fcm_token = ?',
      [userId, fcmToken],
    );
  }

  async listForHousehold(householdId: number): Promise<string[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT DISTINCT pt.fcm_token AS fcmToken
       FROM push_tokens pt
       JOIN household_members hm ON hm.user_id = pt.user_id
       WHERE hm.household_id = ?`,
      [householdId],
    );
    return rows.map((r) => r.fcmToken as string);
  }
}
