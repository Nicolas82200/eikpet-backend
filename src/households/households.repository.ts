import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../database/database.constants';

export type HouseholdRole = 'owner' | 'member';

export interface Household {
  id: number;
  name: string;
  inviteCode: string;
  createdAt: Date;
}

export interface HouseholdMembership {
  householdId: number;
  userId: number;
  role: HouseholdRole;
}

@Injectable()
export class HouseholdsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async create(name: string, inviteCode: string): Promise<Household> {
    const [result] = await this.pool.query<ResultSetHeader>(
      'INSERT INTO households (name, invite_code) VALUES (?, ?)',
      [name, inviteCode],
    );
    return { id: result.insertId, name, inviteCode, createdAt: new Date() };
  }

  async findById(id: number): Promise<Household | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT id, name, invite_code AS inviteCode, created_at AS createdAt FROM households WHERE id = ?',
      [id],
    );
    return (rows[0] as Household) ?? null;
  }

  async findByInviteCode(inviteCode: string): Promise<Household | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT id, name, invite_code AS inviteCode, created_at AS createdAt FROM households WHERE invite_code = ?',
      [inviteCode],
    );
    return (rows[0] as Household) ?? null;
  }

  async addMember(
    householdId: number,
    userId: number,
    role: HouseholdRole,
  ): Promise<void> {
    await this.pool.query(
      'INSERT INTO household_members (household_id, user_id, role) VALUES (?, ?, ?)',
      [householdId, userId, role],
    );
  }

  async isMember(householdId: number, userId: number): Promise<boolean> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT 1 FROM household_members WHERE household_id = ? AND user_id = ? LIMIT 1',
      [householdId, userId],
    );
    return rows.length > 0;
  }

  async getRole(
    householdId: number,
    userId: number,
  ): Promise<HouseholdRole | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT role FROM household_members WHERE household_id = ? AND user_id = ? LIMIT 1',
      [householdId, userId],
    );
    return (rows[0]?.role as HouseholdRole) ?? null;
  }

  async rename(householdId: number, name: string): Promise<void> {
    await this.pool.query('UPDATE households SET name = ? WHERE id = ?', [
      name,
      householdId,
    ]);
  }

  async listForUser(
    userId: number,
  ): Promise<(Household & { role: HouseholdRole })[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT h.id, h.name, h.invite_code AS inviteCode, h.created_at AS createdAt, hm.role
       FROM households h
       JOIN household_members hm ON hm.household_id = h.id
       WHERE hm.user_id = ?`,
      [userId],
    );
    return rows as (Household & { role: HouseholdRole })[];
  }

  async listMembers(householdId: number) {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT u.id, u.email, u.first_name AS firstName, u.last_name AS lastName, hm.role
       FROM household_members hm
       JOIN users u ON u.id = hm.user_id
       WHERE hm.household_id = ?`,
      [householdId],
    );
    return rows;
  }

  async regenerateInviteCode(
    householdId: number,
    inviteCode: string,
  ): Promise<void> {
    await this.pool.query(
      'UPDATE households SET invite_code = ? WHERE id = ?',
      [inviteCode, householdId],
    );
  }
}
