import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../database/database.constants';

export interface WeightEntry {
  id: number;
  animalId: number;
  weightKg: number;
  recordedDate: string;
  notes: string | null;
}

export interface WeightEntryInput {
  weightKg: number;
  recordedDate: string;
  notes?: string | null;
}

const SELECT_FIELDS = `
  id, animal_id AS animalId, weight_kg AS weightKg, recorded_date AS recordedDate, notes
`;

@Injectable()
export class WeightEntriesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByAnimal(animalId: number): Promise<WeightEntry[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM weight_entries WHERE animal_id = ? ORDER BY recorded_date ASC`,
      [animalId],
    );
    return rows.map(mapRowToWeightEntry);
  }

  async findById(id: number): Promise<WeightEntry | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM weight_entries WHERE id = ?`,
      [id],
    );
    return rows[0] ? mapRowToWeightEntry(rows[0]) : null;
  }

  async create(
    animalId: number,
    input: WeightEntryInput,
  ): Promise<WeightEntry> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO weight_entries (animal_id, weight_kg, recorded_date, notes)
       VALUES (?, ?, ?, ?)`,
      [animalId, input.weightKg, input.recordedDate, input.notes ?? null],
    );
    return (await this.findById(result.insertId))!;
  }

  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM weight_entries WHERE id = ?', [id]);
  }
}

/**
 * mysql2 renvoie les colonnes DECIMAL sous forme de chaine (a forcer en nombre) et les
 * colonnes DATE sous forme d'objet Date en heure locale : un toISOString() naif decalerait
 * la date d'un jour selon le fuseau horaire du serveur. On reconstruit donc la date locale.
 */
function mapRowToWeightEntry(row: RowDataPacket): WeightEntry {
  return {
    ...row,
    weightKg: Number(row.weightKg),
    recordedDate: formatDateOnly(row.recordedDate as Date | string),
  } as WeightEntry;
}

function formatDateOnly(value: Date | string): string {
  if (typeof value === 'string') {
    return value;
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
