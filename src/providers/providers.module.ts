import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { HouseholdsRepositoryModule } from '../households/households-repository.module';
import { AnimalsModule } from '../animals/animals.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ProvidersRepository } from './providers.repository';
import { GeocodingService } from './geocoding.service';
import { AnimalProvidersController } from './animal-providers.controller';
import { AnimalProvidersService } from './animal-providers.service';
import { AnimalProvidersRepository } from './animal-providers.repository';

@Module({
  imports: [
    TokenModule,
    HouseholdsRepositoryModule,
    AnimalsModule,
    SubscriptionsModule,
  ],
  controllers: [ProvidersController, AnimalProvidersController],
  providers: [
    ProvidersService,
    ProvidersRepository,
    GeocodingService,
    AnimalProvidersService,
    AnimalProvidersRepository,
  ],
})
export class ProvidersModule {}
