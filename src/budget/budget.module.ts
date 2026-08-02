import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { AnimalsModule } from '../animals/animals.module';
import { HouseholdsRepositoryModule } from '../households/households-repository.module';
import { HealthModule } from '../health/health.module';
import { PensionModule } from '../pension/pension.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';

@Module({
  imports: [
    TokenModule,
    AnimalsModule,
    HouseholdsRepositoryModule,
    HealthModule,
    PensionModule,
    SubscriptionsModule,
  ],
  controllers: [BudgetController],
  providers: [BudgetService],
})
export class BudgetModule {}
