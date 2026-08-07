import { IsInt } from 'class-validator';

export class LinkAnimalProviderDto {
  @IsInt()
  providerId!: number;
}
