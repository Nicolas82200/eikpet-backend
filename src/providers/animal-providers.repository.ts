import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { DATABASE_POOL } from '../database/database.constants';
import type { Provider } from './providers.repository';

const SELECT_FIELDS = `
  p.id, p.household_id AS householdId, p.type, p.custom_type_label AS customTypeLabel,
  p.name, p.phone, p.email, p.address, p.latitude, p.longitude, p.notes
`;

@Injectable()
export class AnimalProvidersRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByAnimal(animalId: number): Promise<Provider[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS}
       FROM animal_providers ap
       JOIN providers p ON p.id = ap.provider_id
       WHERE ap.animal_id = ?
       ORDER BY p.name`,
      [animalId],
    );
    return rows as Provider[];
  }

  async link(animalId: number, providerId: number): Promise<void> {
    await this.pool.query(
      'INSERT IGNORE INTO animal_providers (animal_id, provider_id) VALUES (?, ?)',
      [animalId, providerId],
    );
  }

  async unlink(animalId: number, providerId: number): Promise<void> {
    await this.pool.query(
      'DELETE FROM animal_providers WHERE animal_id = ? AND provider_id = ?',
      [animalId, providerId],
    );
  }
}
