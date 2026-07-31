import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../../database/database.constants';

export interface Treatment {
  id: number;
  animalId: number;
  name: string;
  dosage: string | null;
  frequency: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export type TreatmentInput = Partial<
  Omit<Treatment, 'id' | 'animalId' | 'name'>
> &
  Pick<Treatment, 'name'>;

const SELECT_FIELDS = `
  id, animal_id AS animalId, name, dosage, frequency,
  start_date AS startDate, end_date AS endDate, notes
`;

@Injectable()
export class TreatmentsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByAnimal(animalId: number): Promise<Treatment[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animal_treatments WHERE animal_id = ? ORDER BY start_date DESC`,
      [animalId],
    );
    return rows as Treatment[];
  }

  async create(animalId: number, input: TreatmentInput): Promise<Treatment> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO animal_treatments (animal_id, name, dosage, frequency, start_date, end_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        animalId,
        input.name,
        input.dosage ?? null,
        input.frequency ?? null,
        input.startDate ?? null,
        input.endDate ?? null,
        input.notes ?? null,
      ],
    );
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animal_treatments WHERE id = ?`,
      [result.insertId],
    );
    return rows[0] as Treatment;
  }

  async findById(id: number): Promise<Treatment | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animal_treatments WHERE id = ?`,
      [id],
    );
    return (rows[0] as Treatment) ?? null;
  }

  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM animal_treatments WHERE id = ?', [id]);
  }
}
