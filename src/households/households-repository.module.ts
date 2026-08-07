import { Module } from '@nestjs/common';
import { HouseholdsRepository } from './households.repository';

/**
 * Module leger ne fournissant que HouseholdsRepository, sans HouseholdsService/le controller.
 * Permet a SubscriptionsModule d'y acceder sans creer de dependance circulaire
 * (HouseholdsModule importe SubscriptionsModule pour PlanLimitsService).
 */
@Module({
  providers: [HouseholdsRepository],
  exports: [HouseholdsRepository],
})
export class HouseholdsRepositoryModule {}
