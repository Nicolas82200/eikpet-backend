import { ForbiddenException, Injectable } from '@nestjs/common';
import { AnimalsService } from '../animals/animals.service';
import { AnimalsRepository } from '../animals/animals.repository';
import { HouseholdsRepository } from '../households/households.repository';
import { HealthEntriesRepository } from '../health/repositories/health-entries.repository';
import { BoardingsRepository } from '../pension/boardings.repository';
import { RidingSessionsRepository } from '../seances/riding-sessions.repository';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';

/**
 * 3.9 Budget : tout est calcule a la volee depuis les entrees de sante/pension/seances,
 * jamais stocke en dur (cf. CLAUDE.md) — evite toute desynchronisation.
 */
@Injectable()
export class BudgetService {
  constructor(
    private readonly animalsService: AnimalsService,
    private readonly animalsRepository: AnimalsRepository,
    private readonly householdsRepository: HouseholdsRepository,
    private readonly healthEntriesRepository: HealthEntriesRepository,
    private readonly boardingsRepository: BoardingsRepository,
    private readonly ridingSessionsRepository: RidingSessionsRepository,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async getAnimalBudget(userId: number, animalId: number) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    await this.planLimitsService.assertCanUseBudget(animal.householdId);

    const [healthTotal, boardingTotal, ridingSessionsTotal, byType] =
      await Promise.all([
        this.healthEntriesRepository.sumPriceForAnimal(animalId),
        this.boardingsRepository.sumPriceForAnimal(animalId),
        this.ridingSessionsRepository.sumPriceForAnimal(animalId),
        this.healthEntriesRepository.sumPriceByTypeForAnimal(animalId),
      ]);

    return {
      animalId,
      healthTotal,
      boardingTotal,
      ridingSessionsTotal,
      total: healthTotal + boardingTotal + ridingSessionsTotal,
      byCategory: byType,
    };
  }

  async getHouseholdBudget(userId: number, householdId: number) {
    const isMember = await this.householdsRepository.isMember(
      householdId,
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'appartenez pas a ce foyer");
    }
    await this.planLimitsService.assertCanUseBudget(householdId);

    const animals = await this.animalsRepository.findByHousehold(householdId);
    const byAnimal = await Promise.all(
      animals.map(async (animal) => {
        const [healthTotal, boardingTotal, ridingSessionsTotal] =
          await Promise.all([
            this.healthEntriesRepository.sumPriceForAnimal(animal.id),
            this.boardingsRepository.sumPriceForAnimal(animal.id),
            this.ridingSessionsRepository.sumPriceForAnimal(animal.id),
          ]);
        return {
          animalId: animal.id,
          animalName: animal.name,
          total: healthTotal + boardingTotal + ridingSessionsTotal,
        };
      }),
    );

    const total = byAnimal.reduce((sum, a) => sum + a.total, 0);

    return { householdId, total, byAnimal };
  }
}
