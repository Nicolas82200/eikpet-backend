import { IsOptional, IsString } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  fcmToken!: string;

  @IsOptional()
  @IsString()
  deviceInfo?: string;
}
