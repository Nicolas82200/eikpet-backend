import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { HouseholdsController } from './households.controller';
import { HouseholdsService } from './households.service';
import { HouseholdsRepositoryModule } from './households-repository.module';
import { AnimalsRepositoryModule } from '../animals/animals-repository.module';
import { DocumentsRepositoryModule } from '../documents/documents-repository.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TokenModule,
    HouseholdsRepositoryModule,
    AnimalsRepositoryModule,
    DocumentsRepositoryModule,
    SubscriptionsModule,
  ],
  controllers: [HouseholdsController],
  providers: [HouseholdsService],
  exports: [HouseholdsRepositoryModule, HouseholdsService],
})
export class HouseholdsModule {}
