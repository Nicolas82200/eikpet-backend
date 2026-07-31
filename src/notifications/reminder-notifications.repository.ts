import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { DATABASE_POOL } from '../database/database.constants';

@Injectable()
export class ReminderNotificationsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async hasBeenSent(
    healthEntryId: number,
    offsetDays: number,
  ): Promise<boolean> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT 1 FROM reminder_notifications WHERE health_entry_id = ? AND offset_days = ? LIMIT 1',
      [healthEntryId, offsetDays],
    );
    return rows.length > 0;
  }

  async markSent(healthEntryId: number, offsetDays: number): Promise<void> {
    await this.pool.query(
      'INSERT IGNORE INTO reminder_notifications (health_entry_id, offset_days) VALUES (?, ?)',
      [healthEntryId, offsetDays],
    );
  }
}
