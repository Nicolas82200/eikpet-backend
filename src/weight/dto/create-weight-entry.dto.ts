import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateWeightEntryDto {
  @IsNumber()
  @Min(0)
  weightKg!: number;

  @IsISO8601()
  recordedDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
