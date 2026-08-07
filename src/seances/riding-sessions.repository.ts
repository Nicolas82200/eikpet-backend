import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../database/database.constants';

export type RidingSessionType = 'dressage' | 'osteo' | 'entrainement' | 'autre';
export type RidingSessionStatus = 'prevu' | 'fait';

export interface RidingSession {
  id: number;
  animalId: number;
  type: RidingSessionType;
  customTypeLabel: string | null;
  scheduledDate: string;
  status: RidingSessionStatus;
  report: string | null;
  price: number | null;
}

export interface RidingSessionInput {
  type: RidingSessionType;
  customTypeLabel?: string | null;
  scheduledDate: string;
  status?: RidingSessionStatus;
  report?: string | null;
  price?: number | null;
}

const SELECT_FIELDS = `
  id, animal_id AS animalId, type, custom_type_label AS customTypeLabel,
  scheduled_date AS scheduledDate, status, report, price
`;

@Injectable()
export class RidingSessionsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByAnimal(animalId: number): Promise<RidingSession[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM riding_sessions WHERE animal_id = ? ORDER BY scheduled_date DESC`,
      [animalId],
    );
    return rows as RidingSession[];
  }

  async findById(id: number): Promise<RidingSession | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM riding_sessions WHERE id = ?`,
      [id],
    );
    return (rows[0] as RidingSession) ?? null;
  }

  async create(
    animalId: number,
    input: RidingSessionInput,
  ): Promise<RidingSession> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO riding_sessions
        (animal_id, type, custom_type_label, scheduled_date, status, report, price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        animalId,
        input.type,
        input.customTypeLabel ?? null,
        input.scheduledDate,
        input.status ?? 'prevu',
        input.report ?? null,
        input.price ?? null,
      ],
    );
    return (await this.findById(result.insertId))!;
  }

  async update(
    id: number,
    input: Partial<RidingSessionInput>,
  ): Promise<RidingSession | null> {
    const columnMap: Record<string, string> = {
      type: 'type',
      customTypeLabel: 'custom_type_label',
      scheduledDate: 'scheduled_date',
      status: 'status',
      report: 'report',
      price: 'price',
    };
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, column] of Object.entries(columnMap)) {
      if (key in input) {
        fields.push(`${column} = ?`);
        values.push((input as Record<string, unknown>)[key]);
      }
    }
    if (fields.length === 0) {
      return this.findById(id);
    }
    values.push(id);
    await this.pool.query(
      `UPDATE riding_sessions SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM riding_sessions WHERE id = ?', [id]);
  }

  /** Utilise par le module budget : somme des prix de seances pour un animal. */
  async sumPriceForAnimal(animalId: number): Promise<number> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(price), 0) AS total FROM riding_sessions WHERE animal_id = ?',
      [animalId],
    );
    return Number((rows[0] as { total: number }).total);
  }
}
