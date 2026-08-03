import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { HouseholdsRepositoryModule } from '../households/households-repository.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ProvidersRepository } from './providers.repository';
import { GeocodingService } from './geocoding.service';

@Module({
  imports: [TokenModule, HouseholdsRepositoryModule, SubscriptionsModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, ProvidersRepository, GeocodingService],
})
export class ProvidersModule {}
