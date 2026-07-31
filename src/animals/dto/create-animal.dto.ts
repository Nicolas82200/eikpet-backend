import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAnimalDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  species!: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsIn(['male', 'femelle', 'inconnu'])
  sex?: 'male' | 'femelle' | 'inconnu';

  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @IsOptional()
  @IsBoolean()
  sterilized?: boolean;

  @IsOptional()
  @IsString()
  microchipNumber?: string;

  @IsOptional()
  @IsNumber()
  currentWeightKg?: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
