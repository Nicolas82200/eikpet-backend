import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { HouseholdsModule } from '../households/households.module';
import { AnimalsController } from './animals.controller';
import { AnimalsService } from './animals.service';
import { AnimalsRepository } from './animals.repository';

@Module({
  imports: [TokenModule, HouseholdsModule],
  controllers: [AnimalsController],
  providers: [AnimalsService, AnimalsRepository],
  exports: [AnimalsService, AnimalsRepository],
})
export class AnimalsModule {}
