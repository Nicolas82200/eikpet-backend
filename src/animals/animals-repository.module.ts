import { Module } from '@nestjs/common';
import { AnimalsRepository } from './animals.repository';

/**
 * Module leger ne fournissant que AnimalsRepository, sans le controller/Multer/HouseholdsModule
 * du AnimalsModule complet. Permet a HouseholdsModule d'y acceder sans creer une dependance
 * circulaire (HouseholdsModule <-> AnimalsModule).
 */
@Module({
  providers: [AnimalsRepository],
  exports: [AnimalsRepository],
})
export class AnimalsRepositoryModule {}
