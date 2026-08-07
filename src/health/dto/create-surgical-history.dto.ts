import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const CURRENT_YEAR = new Date().getFullYear();

export class CreateSurgicalHistoryDto {
  @IsString()
  procedureName!: string;

  /** Seule information obligatoire sur la date : mois/jour sont souvent inconnus pour un antecedent ancien. */
  @IsInt()
  @Min(1950)
  @Max(CURRENT_YEAR)
  performedYear!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  performedMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  performedDay?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
