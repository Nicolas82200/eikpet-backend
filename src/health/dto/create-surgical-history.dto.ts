import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateSurgicalHistoryDto {
  @IsString()
  procedureName!: string;

  @IsOptional()
  @IsISO8601()
  performedOn?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
