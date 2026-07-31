import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../../database/database.constants';

export interface PasswordResetToken {
  id: number;
  userId: number;
  codeHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

@Injectable()
export class PasswordResetTokensRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async create(
    userId: number,
    codeHash: string,
    expiresAt: Date,
  ): Promise<number> {
    const [result] = await this.pool.query<ResultSetHeader>(
      'INSERT INTO password_reset_tokens (user_id, code_hash, expires_at) VALUES (?, ?, ?)',
      [userId, codeHash, expiresAt],
    );
    return result.insertId;
  }

  async findValidByUserAndCodeHash(
    userId: number,
    codeHash: string,
  ): Promise<PasswordResetToken | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id, user_id AS userId, code_hash AS codeHash, expires_at AS expiresAt, used_at AS usedAt
       FROM password_reset_tokens
       WHERE user_id = ? AND code_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
      [userId, codeHash],
    );
    return (rows[0] as PasswordResetToken) ?? null;
  }

  async markUsed(id: number): Promise<void> {
    await this.pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
      [id],
    );
  }
}
