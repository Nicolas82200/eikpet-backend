import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

const SESSION_TYPES = ['dressage', 'osteo', 'entrainement', 'autre'] as const;
const STATUSES = ['prevu', 'fait'] as const;

export class CreateRidingSessionDto {
  @IsIn(SESSION_TYPES)
  type!: (typeof SESSION_TYPES)[number];

  @IsOptional()
  @IsString()
  customTypeLabel?: string;

  @IsISO8601()
  scheduledDate!: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsString()
  report?: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}
