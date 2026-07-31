import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { HouseholdsController } from './households.controller';
import { HouseholdsService } from './households.service';
import { HouseholdsRepository } from './households.repository';

@Module({
  imports: [TokenModule],
  controllers: [HouseholdsController],
  providers: [HouseholdsService, HouseholdsRepository],
  exports: [HouseholdsRepository, HouseholdsService],
})
export class HouseholdsModule {}
