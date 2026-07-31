import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../../database/database.constants';

export type HealthEntryType =
  | 'vaccin'
  | 'vermifuge'
  | 'rdv_veto'
  | 'osteo'
  | 'dentiste_equin'
  | 'marechal'
  | 'autre';

export type HealthEntryStatus = 'prevu' | 'fait';

export interface HealthEntry {
  id: number;
  animalId: number;
  type: HealthEntryType;
  customTypeLabel: string | null;
  scheduledDate: string;
  status: HealthEntryStatus;
  report: string | null;
  price: number | null;
  nextReminderDate: string | null;
}

export interface HealthEntryInput {
  type: HealthEntryType;
  customTypeLabel?: string | null;
  scheduledDate: string;
  status?: HealthEntryStatus;
  report?: string | null;
  price?: number | null;
  nextReminderDate?: string | null;
}

const SELECT_FIELDS = `
  id, animal_id AS animalId, type, custom_type_label AS customTypeLabel,
  scheduled_date AS scheduledDate, status, report, price, next_reminder_date AS nextReminderDate
`;

@Injectable()
export class HealthEntriesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByAnimal(animalId: number): Promise<HealthEntry[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM health_entries WHERE animal_id = ? ORDER BY scheduled_date DESC`,
      [animalId],
    );
    return rows as HealthEntry[];
  }

  async findById(id: number): Promise<HealthEntry | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM health_entries WHERE id = ?`,
      [id],
    );
    return (rows[0] as HealthEntry) ?? null;
  }

  async create(
    animalId: number,
    input: HealthEntryInput,
  ): Promise<HealthEntry> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO health_entries
        (animal_id, type, custom_type_label, scheduled_date, status, report, price, next_reminder_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        animalId,
        input.type,
        input.customTypeLabel ?? null,
        input.scheduledDate,
        input.status ?? 'prevu',
        input.report ?? null,
        input.price ?? null,
        input.nextReminderDate ?? null,
      ],
    );
    return (await this.findById(result.insertId))!;
  }

  async update(
    id: number,
    input: Partial<HealthEntryInput>,
  ): Promise<HealthEntry | null> {
    const columnMap: Record<string, string> = {
      type: 'type',
      customTypeLabel: 'custom_type_label',
      scheduledDate: 'scheduled_date',
      status: 'status',
      report: 'report',
      price: 'price',
      nextReminderDate: 'next_reminder_date',
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
      `UPDATE health_entries SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM health_entries WHERE id = ?', [id]);
  }

  /** Utilise par le scheduler de notifications : toutes les entrees avec un rappel a venir, tous foyers confondus. */
  async findAllWithUpcomingReminders(): Promise<
    (HealthEntry & { householdId: number; animalName: string })[]
  > {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT
         he.id, he.animal_id AS animalId, he.type, he.custom_type_label AS customTypeLabel,
         he.scheduled_date AS scheduledDate, he.status, he.report, he.price,
         he.next_reminder_date AS nextReminderDate, a.household_id AS householdId, a.name AS animalName
       FROM health_entries he
       JOIN animals a ON a.id = he.animal_id
       WHERE he.next_reminder_date IS NOT NULL AND he.next_reminder_date >= CURDATE()`,
    );
    return rows as (HealthEntry & {
      householdId: number;
      animalName: string;
    })[];
  }

  async findUpcomingForHousehold(
    householdId: number,
  ): Promise<(HealthEntry & { animalName: string })[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT
         he.id, he.animal_id AS animalId, he.type, he.custom_type_label AS customTypeLabel,
         he.scheduled_date AS scheduledDate, he.status, he.report, he.price,
         he.next_reminder_date AS nextReminderDate, a.name AS animalName
       FROM health_entries he
       JOIN animals a ON a.id = he.animal_id
       WHERE a.household_id = ? AND (he.next_reminder_date IS NOT NULL OR he.status = 'prevu')
       ORDER BY COALESCE(he.next_reminder_date, he.scheduled_date) ASC`,
      [householdId],
    );
    return rows as (HealthEntry & { animalName: string })[];
  }
}
