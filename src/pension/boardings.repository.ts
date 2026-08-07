import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../database/database.constants';
import { countElapsedOccurrences } from './boarding-schedule.util';

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
  /** AAAA-MM-JJ : point de depart de la recurrence ("depuis quand"), null pour 'unique'. */
  startDate: string | null;
  /** Jour du mois (1-31), utilise pour 'mensuel'. */
  dayOfMonth: number | null;
  /** Mois (1-12) de l'echeance annuelle, utilise pour 'annuel'. */
  recurrenceMonth: number | null;
  /** Jour du mois de l'echeance annuelle, utilise pour 'annuel'. */
  recurrenceDay: number | null;
  /** Jour de la semaine (0 = lundi ... 6 = dimanche), utilise pour 'hebdomadaire'. */
  dayOfWeek: number | null;
  status: BoardingStatus;
  notes: string | null;
}

export interface BoardingEntryInput {
  name: string;
  address?: string | null;
  price?: number | null;
  periodicity?: BoardingPeriodicity;
  dueDate?: string;
  startDate?: string | null;
  dayOfMonth?: number | null;
  recurrenceMonth?: number | null;
  recurrenceDay?: number | null;
  dayOfWeek?: number | null;
  status?: BoardingStatus;
  notes?: string | null;
}

const SELECT_FIELDS = `
  id, animal_id AS animalId, name, address, price, periodicity,
  due_date AS dueDate, start_date AS startDate, day_of_month AS dayOfMonth,
  recurrence_month AS recurrenceMonth, recurrence_day AS recurrenceDay,
  day_of_week AS dayOfWeek, status, notes
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
        (animal_id, name, address, price, periodicity, due_date, start_date,
         day_of_month, recurrence_month, recurrence_day, day_of_week, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        animalId,
        input.name,
        input.address ?? null,
        input.price ?? null,
        input.periodicity ?? 'unique',
        input.dueDate,
        input.startDate ?? null,
        input.dayOfMonth ?? null,
        input.recurrenceMonth ?? null,
        input.recurrenceDay ?? null,
        input.dayOfWeek ?? null,
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
      startDate: 'start_date',
      dayOfMonth: 'day_of_month',
      recurrenceMonth: 'recurrence_month',
      recurrenceDay: 'recurrence_day',
      dayOfWeek: 'day_of_week',
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

  /**
   * Montant du a date pour une echeance : le prix pour une echeance 'unique',
   * ou prix x nombre d'occurrences echues depuis start_date pour une echeance recurrente.
   */
  private amountDue(entry: BoardingEntry): number {
    if (entry.price == null) return 0;
    const occurrences = countElapsedOccurrences({
      periodicity: entry.periodicity,
      startDate: entry.startDate,
      dayOfMonth: entry.dayOfMonth,
      recurrenceMonth: entry.recurrenceMonth,
      recurrenceDay: entry.recurrenceDay,
      dayOfWeek: entry.dayOfWeek,
    });
    return entry.price * occurrences;
  }

  /** Utilise par le module budget : somme des montants dus de pension pour un animal. */
  async sumPriceForAnimal(animalId: number): Promise<number> {
    const entries = await this.findByAnimal(animalId);
    return entries.reduce((total, entry) => total + this.amountDue(entry), 0);
  }

  /** Utilise par le module budget : somme des montants dus de pension, tous animaux d'un foyer. */
  async sumPriceForHousehold(householdId: number): Promise<number> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM boarding_entries be
       JOIN animals a ON a.id = be.animal_id
       WHERE a.household_id = ?`,
      [householdId],
    );
    return (rows as BoardingEntry[]).reduce(
      (total, entry) => total + this.amountDue(entry),
      0,
    );
  }
}
