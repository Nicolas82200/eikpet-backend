import { IsISO8601, IsOptional, IsString, Matches } from 'class-validator';

export class CreateTreatmentDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  /** Heures de prise separees par des virgules, ex: "08:00,13:00,20:00". */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(,([01]\d|2[0-3]):[0-5]\d)*$/, {
    message:
      'reminderTimes doit etre une liste de HH:MM separees par des virgules',
  })
  reminderTimes?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
