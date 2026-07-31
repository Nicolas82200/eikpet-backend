import { Inject, Injectable } from '@nestjs/common';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { DATABASE_POOL } from '../../database/database.constants';

export interface MedicalProfile {
  animalId: number;
  chronicConditions: string | null;
  allergies: string | null;
  dietaryNeeds: string | null;
  behavioralNotes: string | null;
  bloodType: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insuranceCoverageLimit: number | null;
  insuranceDeductible: number | null;
  referringVetName: string | null;
  referringVetPhone: string | null;
}

export type MedicalProfileInput = Omit<MedicalProfile, 'animalId'>;

const SELECT_FIELDS = `
  animal_id AS animalId, chronic_conditions AS chronicConditions, allergies, dietary_needs AS dietaryNeeds,
  behavioral_notes AS behavioralNotes, blood_type AS bloodType, insurance_provider AS insuranceProvider,
  insurance_policy_number AS insurancePolicyNumber, insurance_coverage_limit AS insuranceCoverageLimit,
  insurance_deductible AS insuranceDeductible, referring_vet_name AS referringVetName,
  referring_vet_phone AS referringVetPhone
`;

@Injectable()
export class MedicalProfileRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByAnimalId(animalId: number): Promise<MedicalProfile | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${SELECT_FIELDS} FROM animal_medical_profiles WHERE animal_id = ?`,
      [animalId],
    );
    return (rows[0] as MedicalProfile) ?? null;
  }

  async upsert(
    animalId: number,
    input: Partial<MedicalProfileInput>,
  ): Promise<MedicalProfile> {
    await this.pool.query(
      `INSERT INTO animal_medical_profiles
        (animal_id, chronic_conditions, allergies, dietary_needs, behavioral_notes, blood_type,
         insurance_provider, insurance_policy_number, insurance_coverage_limit, insurance_deductible,
         referring_vet_name, referring_vet_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         chronic_conditions = VALUES(chronic_conditions),
         allergies = VALUES(allergies),
         dietary_needs = VALUES(dietary_needs),
         behavioral_notes = VALUES(behavioral_notes),
         blood_type = VALUES(blood_type),
         insurance_provider = VALUES(insurance_provider),
         insurance_policy_number = VALUES(insurance_policy_number),
         insurance_coverage_limit = VALUES(insurance_coverage_limit),
         insurance_deductible = VALUES(insurance_deductible),
         referring_vet_name = VALUES(referring_vet_name),
         referring_vet_phone = VALUES(referring_vet_phone)`,
      [
        animalId,
        input.chronicConditions ?? null,
        input.allergies ?? null,
        input.dietaryNeeds ?? null,
        input.behavioralNotes ?? null,
        input.bloodType ?? null,
        input.insuranceProvider ?? null,
        input.insurancePolicyNumber ?? null,
        input.insuranceCoverageLimit ?? null,
        input.insuranceDeductible ?? null,
        input.referringVetName ?? null,
        input.referringVetPhone ?? null,
      ],
    );
    return (await this.findByAnimalId(animalId))!;
  }
}
