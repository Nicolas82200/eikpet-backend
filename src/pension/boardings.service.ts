import { Injectable, NotFoundException } from '@nestjs/common';
import { AnimalsService } from '../animals/animals.service';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';
import {
  BoardingsRepository,
  type BoardingEntryInput,
} from './boardings.repository';
import { computeNextDueDate } from './boarding-schedule.util';

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
    return this.boardingsRepository.create(
      animalId,
      this.withComputedDueDate(input),
    );
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
    const existing = await this.getOwnedEntry(animalId, entryId);
    const periodicity = input.periodicity ?? existing.periodicity;

    if (periodicity === 'unique') {
      return this.boardingsRepository.update(entryId, input);
    }

    const nextDueDate = computeNextDueDate({
      periodicity,
      startDate:
        'startDate' in input ? (input.startDate ?? null) : existing.startDate,
      dayOfMonth:
        'dayOfMonth' in input
          ? (input.dayOfMonth ?? null)
          : existing.dayOfMonth,
      recurrenceMonth:
        'recurrenceMonth' in input
          ? (input.recurrenceMonth ?? null)
          : existing.recurrenceMonth,
      recurrenceDay:
        'recurrenceDay' in input
          ? (input.recurrenceDay ?? null)
          : existing.recurrenceDay,
      dayOfWeek:
        'dayOfWeek' in input ? (input.dayOfWeek ?? null) : existing.dayOfWeek,
    });
    return this.boardingsRepository.update(entryId, {
      ...input,
      dueDate: nextDueDate ?? existing.dueDate,
    });
  }

  /** Pour les periodicites recurrentes, la prochaine echeance est calculee automatiquement depuis start_date. */
  private withComputedDueDate(input: BoardingEntryInput): BoardingEntryInput {
    if (!input.periodicity || input.periodicity === 'unique') {
      return input;
    }
    const nextDueDate = computeNextDueDate({
      periodicity: input.periodicity,
      startDate: input.startDate ?? null,
      dayOfMonth: input.dayOfMonth ?? null,
      recurrenceMonth: input.recurrenceMonth ?? null,
      recurrenceDay: input.recurrenceDay ?? null,
      dayOfWeek: input.dayOfWeek ?? null,
    });
    return { ...input, dueDate: nextDueDate ?? input.dueDate };
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
