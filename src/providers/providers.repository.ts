import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../database/database.constants';

export type ProviderType =
  | 'veto'
  | 'osteo'
  | 'marechal'
  | 'pension'
  | 'toiletteur'
  | 'educateur'
  | 'autre';

export interface Provider {
  id: number;
  householdId: number;
  type: ProviderType;
  customTypeLabel: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

export interface ProviderInput {
  type: ProviderType;
  customTypeLabel?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

const SELECT_FIELDS = `
  id, household_id AS householdId, type, custom_type_label AS customTypeLabel,
  name, phone, email, address, notes
`;

@Injectable()
export class ProvidersRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async create(householdId: number, input: ProviderInput): Promise<Provider> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO providers
        (household_id, type, custom_type_label, name, phone, email, address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        householdId,
        input.type,
        input.customTypeLabel ?? null,
        input.name,
        input.phone ?? null,
        input.email ?? null,
        input.address ?? null,
        input.notes ?? null,
      ],
    );
    return (await this.findById(result.insertId))!;
  }

  async findById(id: number): Promise<Provider | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM providers WHERE id = ?`,
      [id],
    );
    return (rows[0] as Provider) ?? null;
  }

  async findByHousehold(householdId: number): Promise<Provider[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM providers WHERE household_id = ? ORDER BY name`,
      [householdId],
    );
    return rows as Provider[];
  }

  async update(
    id: number,
    input: Partial<ProviderInput>,
  ): Promise<Provider | null> {
    const columnMap: Record<string, string> = {
      type: 'type',
      customTypeLabel: 'custom_type_label',
      name: 'name',
      phone: 'phone',
      email: 'email',
      address: 'address',
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
      `UPDATE providers SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM providers WHERE id = ?', [id]);
  }
}
