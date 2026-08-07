import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { HouseholdsController } from './households.controller';
import { HouseholdsService } from './households.service';
import { HouseholdsRepository } from './households.repository';
import { AnimalsRepositoryModule } from '../animals/animals-repository.module';
import { DocumentsRepositoryModule } from '../documents/documents-repository.module';

@Module({
  imports: [TokenModule, AnimalsRepositoryModule, DocumentsRepositoryModule],
  controllers: [HouseholdsController],
  providers: [HouseholdsService, HouseholdsRepository],
  exports: [HouseholdsRepository, HouseholdsService],
})
export class HouseholdsModule {}
