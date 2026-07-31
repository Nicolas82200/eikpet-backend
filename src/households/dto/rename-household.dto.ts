import { IsString, MinLength } from 'class-validator';

export class RenameHouseholdDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
