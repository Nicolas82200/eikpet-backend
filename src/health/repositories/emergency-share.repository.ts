import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../../database/database.constants';

export interface EmergencyShareLink {
  id: number;
  animalId: number;
  expiresAt: string;
  createdAt: string;
}

const SELECT_FIELDS = `
  id, animal_id AS animalId, expires_at AS expiresAt, created_at AS createdAt
`;

@Injectable()
export class EmergencyShareRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async create(
    animalId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<EmergencyShareLink> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO emergency_share_tokens (animal_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
      [animalId, tokenHash, expiresAt],
    );
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM emergency_share_tokens WHERE id = ?`,
      [result.insertId],
    );
    return mapRow(rows[0]);
  }

  async findActiveByAnimal(animalId: number): Promise<EmergencyShareLink[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM emergency_share_tokens
       WHERE animal_id = ? AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [animalId],
    );
    return rows.map(mapRow);
  }

  /** Renvoie l'animal_id si le token est valide (non revoque, non expire), sinon null. */
  async findValidAnimalIdByTokenHash(
    tokenHash: string,
  ): Promise<number | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT animal_id AS animalId FROM emergency_share_tokens
       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash],
    );
    return rows[0] ? (rows[0].animalId as number) : null;
  }

  async revoke(id: number, animalId: number): Promise<void> {
    await this.pool.query(
      'UPDATE emergency_share_tokens SET revoked_at = NOW() WHERE id = ? AND animal_id = ?',
      [id, animalId],
    );
  }
}

function mapRow(row: RowDataPacket): EmergencyShareLink {
  return {
    ...row,
    expiresAt: formatDateTime(row.expiresAt as Date | string),
    createdAt: formatDateTime(row.createdAt as Date | string),
  } as EmergencyShareLink;
}

function formatDateTime(value: Date | string): string {
  return typeof value === 'string' ? value : value.toISOString();
}
