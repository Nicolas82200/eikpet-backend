import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../database/database.constants';

export interface Animal {
  id: number;
  householdId: number;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  sex: 'male' | 'femelle' | 'inconnu';
  birthDate: string | null;
  sterilized: boolean;
  microchipNumber: string | null;
  currentWeightKg: number | null;
  photoUrl: string | null;
}

export interface AnimalInput {
  name: string;
  species: string;
  breed?: string | null;
  color?: string | null;
  sex?: 'male' | 'femelle' | 'inconnu';
  birthDate?: string | null;
  sterilized?: boolean;
  microchipNumber?: string | null;
  currentWeightKg?: number | null;
  photoUrl?: string | null;
}

const SELECT_FIELDS = `
  id, household_id AS householdId, name, species, breed, color, sex,
  birth_date AS birthDate, sterilized, microchip_number AS microchipNumber,
  current_weight_kg AS currentWeightKg, photo_url AS photoUrl
`;

@Injectable()
export class AnimalsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async create(householdId: number, input: AnimalInput): Promise<Animal> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO animals
        (household_id, name, species, breed, color, sex, birth_date, sterilized, microchip_number, current_weight_kg, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        householdId,
        input.name,
        input.species,
        input.breed ?? null,
        input.color ?? null,
        input.sex ?? 'inconnu',
        input.birthDate ?? null,
        input.sterilized ?? false,
        input.microchipNumber ?? null,
        input.currentWeightKg ?? null,
        input.photoUrl ?? null,
      ],
    );
    return (await this.findById(result.insertId))!;
  }

  async findById(id: number): Promise<Animal | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animals WHERE id = ?`,
      [id],
    );
    return (rows[0] as Animal) ?? null;
  }

  async findByHousehold(householdId: number): Promise<Animal[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animals WHERE household_id = ? ORDER BY name`,
      [householdId],
    );
    return rows as Animal[];
  }

  async update(
    id: number,
    input: Partial<AnimalInput>,
  ): Promise<Animal | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    const columnMap: Record<string, string> = {
      name: 'name',
      species: 'species',
      breed: 'breed',
      color: 'color',
      sex: 'sex',
      birthDate: 'birth_date',
      sterilized: 'sterilized',
      microchipNumber: 'microchip_number',
      currentWeightKg: 'current_weight_kg',
      photoUrl: 'photo_url',
    };
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
      `UPDATE animals SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM animals WHERE id = ?', [id]);
  }
}
