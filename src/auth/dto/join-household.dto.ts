import { IsString } from 'class-validator';

export class JoinHouseholdDto {
  @IsString()
  inviteCode!: string;
}
