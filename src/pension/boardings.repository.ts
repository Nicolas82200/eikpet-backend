import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../database/database.constants';

export type BoardingPeriodicity =
  'unique' | 'hebdomadaire' | 'mensuel' | 'annuel';
export type BoardingStatus = 'regle' | 'non_regle';

export interface BoardingEntry {
  id: number;
  animalId: number;
  name: string;
  address: string | null;
  price: number | null;
  periodicity: BoardingPeriodicity;
  dueDate: string;
  status: BoardingStatus;
  notes: string | null;
}

export interface BoardingEntryInput {
  name: string;
  address?: string | null;
  price?: number | null;
  periodicity?: BoardingPeriodicity;
  dueDate: string;
  status?: BoardingStatus;
  notes?: string | null;
}

const SELECT_FIELDS = `
  id, animal_id AS animalId, name, address, price, periodicity,
  due_date AS dueDate, status, notes
`;

@Injectable()
export class BoardingsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByAnimal(animalId: number): Promise<BoardingEntry[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM boarding_entries WHERE animal_id = ? ORDER BY due_date DESC`,
      [animalId],
    );
    return rows as BoardingEntry[];
  }

  async findById(id: number): Promise<BoardingEntry | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM boarding_entries WHERE id = ?`,
      [id],
    );
    return (rows[0] as BoardingEntry) ?? null;
  }

  async create(
    animalId: number,
    input: BoardingEntryInput,
  ): Promise<BoardingEntry> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO boarding_entries
        (animal_id, name, address, price, periodicity, due_date, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        animalId,
        input.name,
        input.address ?? null,
        input.price ?? null,
        input.periodicity ?? 'unique',
        input.dueDate,
        input.status ?? 'non_regle',
        input.notes ?? null,
      ],
    );
    return (await this.findById(result.insertId))!;
  }

  async update(
    id: number,
    input: Partial<BoardingEntryInput>,
  ): Promise<BoardingEntry | null> {
    const columnMap: Record<string, string> = {
      name: 'name',
      address: 'address',
      price: 'price',
      periodicity: 'periodicity',
      dueDate: 'due_date',
      status: 'status',
      notes: 'notes',
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
      `UPDATE boarding_entries SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM boarding_entries WHERE id = ?', [id]);
  }

  /** Utilise par le module budget : somme des prix de pension pour un animal. */
  async sumPriceForAnimal(animalId: number): Promise<number> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(price), 0) AS total FROM boarding_entries WHERE animal_id = ?',
      [animalId],
    );
    return Number((rows[0] as { total: number }).total);
  }

  /** Utilise par le module budget : somme des prix de pension, tous animaux d'un foyer. */
  async sumPriceForHousehold(householdId: number): Promise<number> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(be.price), 0) AS total
       FROM boarding_entries be
       JOIN animals a ON a.id = be.animal_id
       WHERE a.household_id = ?`,
      [householdId],
    );
    return Number((rows[0] as { total: number }).total);
  }
}
