import { Injectable, NotFoundException } from '@nestjs/common';
import { AnimalsService } from '../animals/animals.service';
import {
  MedicalProfileRepository,
  type MedicalProfileInput,
} from './repositories/medical-profile.repository';
import {
  TreatmentsRepository,
  type TreatmentInput,
} from './repositories/treatments.repository';
import {
  SurgicalHistoryRepository,
  type SurgicalHistoryInput,
} from './repositories/surgical-history.repository';
import {
  HealthEntriesRepository,
  type HealthEntryInput,
} from './repositories/health-entries.repository';
import { RemindersService } from './reminders.service';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly animalsService: AnimalsService,
    private readonly medicalProfileRepository: MedicalProfileRepository,
    private readonly treatmentsRepository: TreatmentsRepository,
    private readonly surgicalHistoryRepository: SurgicalHistoryRepository,
    private readonly healthEntriesRepository: HealthEntriesRepository,
    private readonly remindersService: RemindersService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  // --- Fiche medicale ---

  async getMedicalProfile(userId: number, animalId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.medicalProfileRepository.findByAnimalId(animalId);
  }

  async upsertMedicalProfile(
    userId: number,
    animalId: number,
    input: Partial<MedicalProfileInput>,
  ) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.medicalProfileRepository.upsert(animalId, input);
  }

  async listTreatments(userId: number, animalId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.treatmentsRepository.findByAnimal(animalId);
  }

  async createTreatment(
    userId: number,
    animalId: number,
    input: TreatmentInput,
  ) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.treatmentsRepository.create(animalId, input);
  }

  async deleteTreatment(userId: number, animalId: number, treatmentId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    const treatment = await this.treatmentsRepository.findById(treatmentId);
    if (!treatment || treatment.animalId !== animalId) {
      throw new NotFoundException('Traitement introuvable');
    }
    await this.treatmentsRepository.delete(treatmentId);
  }

  async listSurgicalHistory(userId: number, animalId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.surgicalHistoryRepository.findByAnimal(animalId);
  }

  async createSurgicalHistory(
    userId: number,
    animalId: number,
    input: SurgicalHistoryInput,
  ) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.surgicalHistoryRepository.create(animalId, input);
  }

  async deleteSurgicalHistory(
    userId: number,
    animalId: number,
    entryId: number,
  ) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    const entry = await this.surgicalHistoryRepository.findById(entryId);
    if (!entry || entry.animalId !== animalId) {
      throw new NotFoundException('Antecedent chirurgical introuvable');
    }
    await this.surgicalHistoryRepository.delete(entryId);
  }

  // --- Carnet de sante ---

  async listHealthEntries(userId: number, animalId: number) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    const floorDate = await this.planLimitsService.getHealthHistoryFloorDate(
      animal.householdId,
    );
    return this.healthEntriesRepository.findByAnimal(
      animalId,
      floorDate ? floorDate.toISOString().slice(0, 10) : null,
    );
  }

  // --- Comptes-rendus (3.7) : historique consolide, reserve a l'abonnement ---

  async listReports(userId: number, animalId: number) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    await this.planLimitsService.assertCanUseReports(animal.householdId);
    return this.healthEntriesRepository.findWithReportByAnimal(animalId);
  }

  async createHealthEntry(
    userId: number,
    animalId: number,
    input: HealthEntryInput & { recurrenceMonths?: number },
  ) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    const nextReminderDate = this.resolveNextReminderDate(input);
    return this.healthEntriesRepository.create(animalId, {
      ...input,
      nextReminderDate,
    });
  }

  async updateHealthEntry(
    userId: number,
    animalId: number,
    entryId: number,
    input: Partial<HealthEntryInput> & { recurrenceMonths?: number },
  ) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    const entry = await this.getOwnedEntry(animalId, entryId);
    const { recurrenceMonths, ...updateInput } = input;
    if (recurrenceMonths) {
      updateInput.nextReminderDate = this.resolveNextReminderDate({
        ...entry,
        ...input,
      });
    }
    return this.healthEntriesRepository.update(entryId, updateInput);
  }

  async deleteHealthEntry(userId: number, animalId: number, entryId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    await this.getOwnedEntry(animalId, entryId);
    await this.healthEntriesRepository.delete(entryId);
  }

  private async getOwnedEntry(animalId: number, entryId: number) {
    const entry = await this.healthEntriesRepository.findById(entryId);
    if (!entry || entry.animalId !== animalId) {
      throw new NotFoundException('Entree du carnet de sante introuvable');
    }
    return entry;
  }

  private resolveNextReminderDate(input: {
    scheduledDate: string;
    recurrenceMonths?: number;
    nextReminderDate?: string | null;
  }): string | null {
    if (input.recurrenceMonths) {
      const next = this.remindersService.calculateNextReminderDate(
        new Date(input.scheduledDate),
        input.recurrenceMonths,
      );
      return next ? next.toISOString().slice(0, 10) : null;
    }
    return input.nextReminderDate ?? null;
  }
}
