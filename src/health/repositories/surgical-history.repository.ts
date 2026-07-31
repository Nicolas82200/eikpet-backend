import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../../database/database.constants';

export interface SurgicalHistoryEntry {
  id: number;
  animalId: number;
  procedureName: string;
  performedOn: string | null;
  notes: string | null;
}

export type SurgicalHistoryInput = Partial<
  Omit<SurgicalHistoryEntry, 'id' | 'animalId' | 'procedureName'>
> &
  Pick<SurgicalHistoryEntry, 'procedureName'>;

const SELECT_FIELDS = `
  id, animal_id AS animalId, procedure_name AS procedureName, performed_on AS performedOn, notes
`;

@Injectable()
export class SurgicalHistoryRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByAnimal(animalId: number): Promise<SurgicalHistoryEntry[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animal_surgical_history WHERE animal_id = ? ORDER BY performed_on DESC`,
      [animalId],
    );
    return rows as SurgicalHistoryEntry[];
  }

  async create(
    animalId: number,
    input: SurgicalHistoryInput,
  ): Promise<SurgicalHistoryEntry> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO animal_surgical_history (animal_id, procedure_name, performed_on, notes)
       VALUES (?, ?, ?, ?)`,
      [
        animalId,
        input.procedureName,
        input.performedOn ?? null,
        input.notes ?? null,
      ],
    );
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animal_surgical_history WHERE id = ?`,
      [result.insertId],
    );
    return rows[0] as SurgicalHistoryEntry;
  }

  async findById(id: number): Promise<SurgicalHistoryEntry | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animal_surgical_history WHERE id = ?`,
      [id],
    );
    return (rows[0] as SurgicalHistoryEntry) ?? null;
  }

  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM animal_surgical_history WHERE id = ?', [
      id,
    ]);
  }
}
