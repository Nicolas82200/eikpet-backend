import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { HealthModule } from '../health/health.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsController } from './notifications.controller';
import { PushTokensRepository } from './push-tokens.repository';
import { ReminderNotificationsRepository } from './reminder-notifications.repository';
import { FcmService } from './fcm.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';

@Module({
  imports: [TokenModule, HealthModule, SubscriptionsModule],
  controllers: [NotificationsController],
  providers: [
    PushTokensRepository,
    ReminderNotificationsRepository,
    FcmService,
    ReminderSchedulerService,
  ],
  exports: [PushTokensRepository],
})
export class NotificationsModule {}
