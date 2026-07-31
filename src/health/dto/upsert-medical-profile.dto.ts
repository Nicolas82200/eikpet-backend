import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertMedicalProfileDto {
  @IsOptional()
  @IsString()
  chronicConditions?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  dietaryNeeds?: string;

  @IsOptional()
  @IsString()
  behavioralNotes?: string;

  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  insurancePolicyNumber?: string;

  @IsOptional()
  @IsNumber()
  insuranceCoverageLimit?: number;

  @IsOptional()
  @IsNumber()
  insuranceDeductible?: number;

  @IsOptional()
  @IsString()
  referringVetName?: string;

  @IsOptional()
  @IsString()
  referringVetPhone?: string;
}
