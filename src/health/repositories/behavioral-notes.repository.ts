import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../../database/database.constants';

export interface BehavioralNote {
  id: number;
  animalId: number;
  note: string;
  createdAt: string;
}

const SELECT_FIELDS = `
  id, animal_id AS animalId, note, created_at AS createdAt
`;

@Injectable()
export class BehavioralNotesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByAnimal(animalId: number): Promise<BehavioralNote[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animal_behavioral_notes WHERE animal_id = ? ORDER BY created_at DESC`,
      [animalId],
    );
    return rows as BehavioralNote[];
  }

  async create(animalId: number, note: string): Promise<BehavioralNote> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO animal_behavioral_notes (animal_id, note) VALUES (?, ?)`,
      [animalId, note],
    );
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animal_behavioral_notes WHERE id = ?`,
      [result.insertId],
    );
    return rows[0] as BehavioralNote;
  }

  async findById(id: number): Promise<BehavioralNote | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animal_behavioral_notes WHERE id = ?`,
      [id],
    );
    return (rows[0] as BehavioralNote) ?? null;
  }

  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM animal_behavioral_notes WHERE id = ?', [
      id,
    ]);
  }
}
