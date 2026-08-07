import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { HouseholdsRepositoryModule } from '../households/households-repository.module';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ProvidersRepository } from './providers.repository';

@Module({
  imports: [TokenModule, HouseholdsRepositoryModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, ProvidersRepository],
})
export class ProvidersModule {}
