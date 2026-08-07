import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../../database/database.constants';

export interface SurgicalHistoryEntry {
  id: number;
  animalId: number;
  procedureName: string;
  /** Annee obligatoire ; mois et jour optionnels (date d'operation parfois imprecise). */
  performedYear: number;
  performedMonth: number | null;
  performedDay: number | null;
  notes: string | null;
}

export type SurgicalHistoryInput = Partial<
  Omit<
    SurgicalHistoryEntry,
    'id' | 'animalId' | 'procedureName' | 'performedYear'
  >
> &
  Pick<SurgicalHistoryEntry, 'procedureName' | 'performedYear'>;

const SELECT_FIELDS = `
  id, animal_id AS animalId, procedure_name AS procedureName,
  performed_year AS performedYear, performed_month AS performedMonth, performed_day AS performedDay, notes
`;

@Injectable()
export class SurgicalHistoryRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByAnimal(animalId: number): Promise<SurgicalHistoryEntry[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animal_surgical_history WHERE animal_id = ?
       ORDER BY performed_year DESC, performed_month DESC, performed_day DESC`,
      [animalId],
    );
    return rows as SurgicalHistoryEntry[];
  }

  async create(
    animalId: number,
    input: SurgicalHistoryInput,
  ): Promise<SurgicalHistoryEntry> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO animal_surgical_history (animal_id, procedure_name, performed_year, performed_month, performed_day, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        animalId,
        input.procedureName,
        input.performedYear,
        input.performedMonth ?? null,
        input.performedDay ?? null,
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
