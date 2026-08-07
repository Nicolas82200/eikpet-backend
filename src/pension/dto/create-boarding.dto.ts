import {
  IsIn,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
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

  /** Echeance unique (periodicite 'unique') : obligatoire dans ce cas, calculee automatiquement sinon. */
  @ValidateIf(
    (o: CreateBoardingDto) => !o.periodicity || o.periodicity === 'unique',
  )
  @IsISO8601()
  dueDate?: string;

  /** "Depuis quand" : point de depart de la recurrence, obligatoire pour les periodicites recurrentes. */
  @ValidateIf(
    (o: CreateBoardingDto) => !!o.periodicity && o.periodicity !== 'unique',
  )
  @IsISO8601()
  startDate?: string;

  @ValidateIf((o: CreateBoardingDto) => o.periodicity === 'mensuel')
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ValidateIf((o: CreateBoardingDto) => o.periodicity === 'annuel')
  @IsInt()
  @Min(1)
  @Max(12)
  recurrenceMonth?: number;

  @ValidateIf((o: CreateBoardingDto) => o.periodicity === 'annuel')
  @IsInt()
  @Min(1)
  @Max(31)
  recurrenceDay?: number;

  @ValidateIf((o: CreateBoardingDto) => o.periodicity === 'hebdomadaire')
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsString()
  notes?: string;
}
