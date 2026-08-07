import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const PROVIDER_TYPES = [
  'veto',
  'osteo',
  'marechal',
  'pension',
  'toiletteur',
  'educateur',
  'autre',
] as const;

export class CreateProviderDto {
  @IsIn(PROVIDER_TYPES)
  type!: (typeof PROVIDER_TYPES)[number];

  @IsOptional()
  @IsString()
  customTypeLabel?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
