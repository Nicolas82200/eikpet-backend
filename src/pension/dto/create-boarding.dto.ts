import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const PERIODICITIES = ['unique', 'hebdomadaire', 'mensuel', 'annuel'] as const;
const STATUSES = ['regle', 'non_regle'] as const;

export class CreateBoardingDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsIn(PERIODICITIES)
  periodicity?: (typeof PERIODICITIES)[number];

  @IsISO8601()
  dueDate!: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsString()
  notes?: string;
}
