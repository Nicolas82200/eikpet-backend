import { Injectable, NotFoundException } from '@nestjs/common';
import { AnimalsService } from '../animals/animals.service';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';
import {
  WeightEntriesRepository,
  type WeightEntryInput,
} from './weight-entries.repository';

@Injectable()
export class WeightEntriesService {
  constructor(
    private readonly animalsService: AnimalsService,
    private readonly weightEntriesRepository: WeightEntriesRepository,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async list(userId: number, animalId: number) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    await this.planLimitsService.assertCanUseWeightCurve(animal.householdId);
    return this.weightEntriesRepository.findByAnimal(animalId);
  }

  async create(userId: number, animalId: number, input: WeightEntryInput) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    await this.planLimitsService.assertCanUseWeightCurve(animal.householdId);
    return this.weightEntriesRepository.create(animalId, input);
  }

  async delete(userId: number, animalId: number, entryId: number) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    await this.planLimitsService.assertCanUseWeightCurve(animal.householdId);
    const entry = await this.weightEntriesRepository.findById(entryId);
    if (!entry || entry.animalId !== animalId) {
      throw new NotFoundException('Entree de poids introuvable');
    }
    await this.weightEntriesRepository.delete(entryId);
  }
}
