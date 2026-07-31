import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { PushTokensRepository } from './push-tokens.repository';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Controller('notifications/push-tokens')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly pushTokensRepository: PushTokensRepository) {}

  @Post()
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushTokensRepository.register(
      user.id,
      dto.fcmToken,
      dto.deviceInfo,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  unregister(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushTokensRepository.unregister(user.id, dto.fcmToken);
  }
}
