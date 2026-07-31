import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../../database/database.constants';

export interface RefreshToken {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

@Injectable()
export class RefreshTokensRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async create(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<number> {
    const [result] = await this.pool.query<ResultSetHeader>(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt],
    );
    return result.insertId;
  }

  async findValidByHash(tokenHash: string): Promise<RefreshToken | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id, user_id AS userId, token_hash AS tokenHash, expires_at AS expiresAt, revoked_at AS revokedAt
       FROM refresh_tokens
       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash],
    );
    return (rows[0] as RefreshToken) ?? null;
  }

  async revoke(id: number): Promise<void> {
    await this.pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?',
      [id],
    );
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [userId],
    );
  }
}
