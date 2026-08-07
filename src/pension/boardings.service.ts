import { Injectable, NotFoundException } from '@nestjs/common';
import { AnimalsService } from '../animals/animals.service';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';
import {
  BoardingsRepository,
  type BoardingEntryInput,
} from './boardings.repository';

@Injectable()
export class BoardingsService {
  constructor(
    private readonly animalsService: AnimalsService,
    private readonly boardingsRepository: BoardingsRepository,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async list(userId: number, animalId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.boardingsRepository.findByAnimal(animalId);
  }

  async create(userId: number, animalId: number, input: BoardingEntryInput) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    await this.planLimitsService.assertCanUsePension(animal.householdId);
    return this.boardingsRepository.create(animalId, input);
  }

  async update(
    userId: number,
    animalId: number,
    entryId: number,
    input: Partial<BoardingEntryInput>,
  ) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    await this.planLimitsService.assertCanUsePension(animal.householdId);
    await this.getOwnedEntry(animalId, entryId);
    return this.boardingsRepository.update(entryId, input);
  }

  async delete(userId: number, animalId: number, entryId: number) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    await this.planLimitsService.assertCanUsePension(animal.householdId);
    await this.getOwnedEntry(animalId, entryId);
    await this.boardingsRepository.delete(entryId);
  }

  private async getOwnedEntry(animalId: number, entryId: number) {
    const entry = await this.boardingsRepository.findById(entryId);
    if (!entry || entry.animalId !== animalId) {
      throw new NotFoundException('Echeance de pension introuvable');
    }
    return entry;
  }
}
