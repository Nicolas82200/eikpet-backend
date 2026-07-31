import { IsIn, IsOptional, IsNumberString } from 'class-validator';

const CATEGORIES = [
  'ordonnance',
  'analyse',
  'certificat_vaccination',
  'autre',
] as const;

export class UploadDocumentDto {
  @IsIn(CATEGORIES)
  category!: (typeof CATEGORIES)[number];

  @IsOptional()
  @IsNumberString()
  animalId?: string;
}
