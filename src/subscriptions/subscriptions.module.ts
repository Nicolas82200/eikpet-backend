import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { HouseholdsRepositoryModule } from '../households/households-repository.module';
import { AnimalsRepositoryModule } from '../animals/animals-repository.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsRepository } from './subscriptions.repository';
import { PlanLimitsService } from './plan-limits.service';

@Module({
  imports: [TokenModule, HouseholdsRepositoryModule, AnimalsRepositoryModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsRepository, PlanLimitsService],
  exports: [SubscriptionsService, PlanLimitsService],
})
export class SubscriptionsModule {}
