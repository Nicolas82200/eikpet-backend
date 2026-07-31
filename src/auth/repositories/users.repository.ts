import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../../database/database.constants';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id, email, password_hash AS passwordHash, first_name AS firstName, last_name AS lastName
       FROM users WHERE email = ?`,
      [email],
    );
    return (rows[0] as User) ?? null;
  }

  async findById(id: number): Promise<User | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id, email, password_hash AS passwordHash, first_name AS firstName, last_name AS lastName
       FROM users WHERE id = ?`,
      [id],
    );
    return (rows[0] as User) ?? null;
  }

  async create(
    email: string,
    passwordHash: string,
    firstName: string,
    lastName: string,
  ): Promise<User> {
    const [result] = await this.pool.query<ResultSetHeader>(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
      [email, passwordHash, firstName, lastName],
    );
    return { id: result.insertId, email, passwordHash, firstName, lastName };
  }
}
