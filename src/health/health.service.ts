import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { AnimalsService } from '../animals/animals.service';
import { AnimalsRepository } from '../animals/animals.repository';
import { calculateAge } from '../animals/age.util';
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
import { AnimalProvidersRepository } from '../providers/animal-providers.repository';
import { EmergencyShareRepository } from './repositories/emergency-share.repository';
import { BehavioralNotesRepository } from './repositories/behavioral-notes.repository';

const DEFAULT_SHARE_LINK_HOURS = 72;

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
    private readonly animalProvidersRepository: AnimalProvidersRepository,
    private readonly emergencyShareRepository: EmergencyShareRepository,
    private readonly animalsRepository: AnimalsRepository,
    private readonly behavioralNotesRepository: BehavioralNotesRepository,
  ) {}

  // --- Notes comportementales (liste, remplace l'ancien champ texte unique) ---

  async listBehavioralNotes(userId: number, animalId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.behavioralNotesRepository.findByAnimal(animalId);
  }

  async createBehavioralNote(userId: number, animalId: number, note: string) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.behavioralNotesRepository.create(animalId, note);
  }

  async deleteBehavioralNote(userId: number, animalId: number, noteId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    const note = await this.behavioralNotesRepository.findById(noteId);
    if (!note || note.animalId !== animalId) {
      throw new NotFoundException('Note comportementale introuvable');
    }
    await this.behavioralNotesRepository.delete(noteId);
  }

  // --- Fiche d'urgence (3.2 bonus) : reste gratuite en toutes circonstances, cf. cahier des charges. ---

  async getEmergencySheet(userId: number, animalId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.buildEmergencySheet(animalId);
  }

  /** Consultation publique (pet-sitter) via un lien temporaire : aucune authentification requise. */
  async getEmergencySheetByToken(token: string) {
    const animalId =
      await this.emergencyShareRepository.findValidAnimalIdByTokenHash(
        hashShareToken(token),
      );
    if (!animalId) {
      throw new NotFoundException('Lien invalide ou expire');
    }
    return this.buildEmergencySheet(animalId);
  }

  async createEmergencyShareLink(
    userId: number,
    animalId: number,
    expiresInHours?: number,
  ) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + (expiresInHours ?? DEFAULT_SHARE_LINK_HOURS) * 3_600_000,
    );
    const link = await this.emergencyShareRepository.create(
      animalId,
      hashShareToken(token),
      expiresAt,
    );
    return { ...link, token };
  }

  async listEmergencyShareLinks(userId: number, animalId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.emergencyShareRepository.findActiveByAnimal(animalId);
  }

  async revokeEmergencyShareLink(
    userId: number,
    animalId: number,
    linkId: number,
  ) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    await this.emergencyShareRepository.revoke(linkId, animalId);
  }

  /**
   * Acces direct par animalId, sans verification d'appartenance a un foyer : l'appelant
   * (getEmergencySheet ou getEmergencySheetByToken) a deja valide l'acces en amont.
   */
  private async buildEmergencySheet(animalId: number) {
    const rawAnimal = await this.animalsRepository.findById(animalId);
    if (!rawAnimal) {
      throw new NotFoundException('Animal introuvable');
    }
    const animal = {
      ...rawAnimal,
      age: rawAnimal.birthDate
        ? calculateAge(new Date(rawAnimal.birthDate))
        : null,
    };
    const [medicalProfile, treatments, providers, behavioralNotes] =
      await Promise.all([
        this.medicalProfileRepository.findByAnimalId(animalId),
        this.treatmentsRepository.findByAnimal(animalId),
        this.animalProvidersRepository.findByAnimal(animalId),
        this.behavioralNotesRepository.findByAnimal(animalId),
      ]);
    return { animal, medicalProfile, treatments, providers, behavioralNotes };
  }

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

  async getVaccinationSchedule(userId: number, animalId: number) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    return this.remindersService.getSuggestedVaccinationSchedule(
      animal.species,
      animal.birthDate,
    );
  }

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

function hashShareToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
