import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateShareLinkDto {
  /** Duree de validite du lien, en heures. Defaut 72h (3 jours), plafonne a 30 jours. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  expiresInHours?: number;
}
