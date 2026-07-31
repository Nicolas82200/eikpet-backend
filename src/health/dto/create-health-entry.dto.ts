import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

const TYPES = [
  'vaccin',
  'vermifuge',
  'rdv_veto',
  'osteo',
  'dentiste_equin',
  'marechal',
  'autre',
] as const;

export class CreateHealthEntryDto {
  @IsIn(TYPES)
  type!: (typeof TYPES)[number];

  @IsOptional()
  @IsString()
  customTypeLabel?: string;

  @IsISO8601()
  scheduledDate!: string;

  @IsOptional()
  @IsIn(['prevu', 'fait'])
  status?: 'prevu' | 'fait';

  @IsOptional()
  @IsString()
  report?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  /** Si fourni, le prochain rappel est calcule automatiquement (ex: 3 = tous les 3 mois). */
  @IsOptional()
  @IsNumber()
  recurrenceMonths?: number;

  @IsOptional()
  @IsISO8601()
  nextReminderDate?: string;
}
