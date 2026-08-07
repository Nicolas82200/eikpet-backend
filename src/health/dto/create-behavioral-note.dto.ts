import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBehavioralNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  note!: string;
}
