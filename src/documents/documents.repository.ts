import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DATABASE_POOL } from '../database/database.constants';

export type DocumentCategory =
  'ordonnance' | 'analyse' | 'certificat_vaccination' | 'autre';

export interface DocumentRecord {
  id: number;
  householdId: number;
  animalId: number | null;
  /** Peut devenir null si le compte de l'uploadeur a ete supprime (ON DELETE SET NULL). */
  uploadedByUserId: number | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  category: DocumentCategory;
  createdAt: Date;
}

export interface DocumentInput {
  animalId: number | null;
  uploadedByUserId: number;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  category: DocumentCategory;
}

const SELECT_FIELDS = `
  id, household_id AS householdId, animal_id AS animalId, uploaded_by_user_id AS uploadedByUserId,
  file_name AS fileName, file_path AS filePath, mime_type AS mimeType, size_bytes AS sizeBytes,
  category, created_at AS createdAt
`;

@Injectable()
export class DocumentsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async create(
    householdId: number,
    input: DocumentInput,
  ): Promise<DocumentRecord> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO documents
        (household_id, animal_id, uploaded_by_user_id, file_name, file_path, mime_type, size_bytes, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        householdId,
        input.animalId,
        input.uploadedByUserId,
        input.fileName,
        input.filePath,
        input.mimeType,
        input.sizeBytes,
        input.category,
      ],
    );
    return (await this.findById(result.insertId))!;
  }

  async findById(id: number): Promise<DocumentRecord | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM documents WHERE id = ?`,
      [id],
    );
    return (rows[0] as DocumentRecord) ?? null;
  }

  async findByHousehold(householdId: number): Promise<DocumentRecord[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM documents WHERE household_id = ? ORDER BY created_at DESC`,
      [householdId],
    );
    return rows as DocumentRecord[];
  }

  async findByAnimal(animalId: number): Promise<DocumentRecord[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM documents WHERE animal_id = ? ORDER BY created_at DESC`,
      [animalId],
    );
    return rows as DocumentRecord[];
  }

  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM documents WHERE id = ?', [id]);
  }
}
