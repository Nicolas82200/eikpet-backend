import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { AnimalsModule } from '../animals/animals.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BoardingsController } from './boardings.controller';
import { BoardingsService } from './boardings.service';
import { BoardingsRepository } from './boardings.repository';

@Module({
  imports: [TokenModule, AnimalsModule, SubscriptionsModule],
  controllers: [BoardingsController],
  providers: [BoardingsService, BoardingsRepository],
  exports: [BoardingsRepository],
})
export class PensionModule {}
