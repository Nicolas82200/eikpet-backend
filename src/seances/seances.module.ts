import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { AnimalsModule } from '../animals/animals.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { RidingSessionsController } from './riding-sessions.controller';
import { RidingSessionsService } from './riding-sessions.service';
import { RidingSessionsRepository } from './riding-sessions.repository';

@Module({
  imports: [TokenModule, AnimalsModule, SubscriptionsModule],
  controllers: [RidingSessionsController],
  providers: [RidingSessionsService, RidingSessionsRepository],
  exports: [RidingSessionsRepository],
})
export class SeancesModule {}
