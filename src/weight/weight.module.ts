import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { AnimalsModule } from '../animals/animals.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WeightEntriesController } from './weight-entries.controller';
import { WeightEntriesService } from './weight-entries.service';
import { WeightEntriesRepository } from './weight-entries.repository';

@Module({
  imports: [TokenModule, AnimalsModule, SubscriptionsModule],
  controllers: [WeightEntriesController],
  providers: [WeightEntriesService, WeightEntriesRepository],
})
export class WeightModule {}
