import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import type { RevenueCatWebhookPayload } from './dto/revenuecat-webhook.dto';
import type { AppConfig } from '../config/configuration';

@Controller()
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  @Get('me/subscription')
  @UseGuards(JwtAuthGuard)
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getStatusForUser(user.id);
  }

  @Post('webhooks/revenuecat')
  async handleWebhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() payload: RevenueCatWebhookPayload,
  ) {
    const expected = `Bearer ${this.configService.get('revenuecat', { infer: true }).webhookSecret}`;
    if (!authorization || authorization !== expected) {
      throw new UnauthorizedException('Secret webhook invalide');
    }
    await this.subscriptionsService.handleRevenueCatWebhook(payload);
    return { received: true };
  }
}
