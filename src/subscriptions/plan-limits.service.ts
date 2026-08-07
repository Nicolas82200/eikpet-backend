import { Injectable } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PlanLimitException, type PlanLimitCode } from './plan-limit.exception';
import { HouseholdsRepository } from '../households/households.repository';
import { AnimalsRepository } from '../animals/animals.repository';

/** Plan gratuit (cf. docs/cahier-des-charges-app-animaux.md §6). */
const FREE_PLAN_MAX_HOUSEHOLDS = 1;
const FREE_PLAN_MAX_ANIMALS_PER_HOUSEHOLD = 2;
const FREE_PLAN_HEALTH_HISTORY_MONTHS = 12;
const FREE_PLAN_NOTIFICATION_OFFSETS = [0];
const PREMIUM_NOTIFICATION_OFFSETS = [7, 1, 0];

/**
 * Garde-fous centralises pour les limites du plan gratuit. Ne pas dupliquer ces regles
 * ailleurs dans le code (meme principe que RemindersService, cf. CLAUDE.md).
 */
@Injectable()
export class PlanLimitsService {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly householdsRepository: HouseholdsRepository,
    private readonly animalsRepository: AnimalsRepository,
  ) {}

  /** A appeler avant de creer un foyer ou de rejoindre un foyer via code d'invitation. */
  async assertCanJoinOrCreateHousehold(userId: number): Promise<void> {
    const isPremium = await this.subscriptionsService.isUserPremium(userId);
    if (isPremium) {
      return;
    }
    const households = await this.householdsRepository.listForUser(userId);
    if (households.length >= FREE_PLAN_MAX_HOUSEHOLDS) {
      throw new PlanLimitException(
        'PLAN_LIMIT_HOUSEHOLD',
        `Le plan gratuit est limite a ${FREE_PLAN_MAX_HOUSEHOLDS} foyer. Passez a l'abonnement pour en rejoindre ou en creer un autre.`,
      );
    }
  }

  async assertCanAddAnimal(householdId: number): Promise<void> {
    const isPremium =
      await this.subscriptionsService.isHouseholdPremium(householdId);
    if (isPremium) {
      return;
    }
    const animals = await this.animalsRepository.findByHousehold(householdId);
    if (animals.length >= FREE_PLAN_MAX_ANIMALS_PER_HOUSEHOLD) {
      throw new PlanLimitException(
        'PLAN_LIMIT_ANIMAL',
        `Le plan gratuit est limite a ${FREE_PLAN_MAX_ANIMALS_PER_HOUSEHOLD} animaux par foyer. Passez a l'abonnement pour en ajouter d'autres.`,
      );
    }
  }

  async assertCanUploadDocument(householdId: number): Promise<void> {
    await this.assertPremiumFeature(
      householdId,
      'PLAN_LIMIT_DOCUMENT',
      "La gestion documentaire n'est disponible qu'avec l'abonnement.",
    );
  }

  async assertCanUsePension(householdId: number): Promise<void> {
    await this.assertPremiumFeature(
      householdId,
      'PLAN_LIMIT_PENSION',
      "Le suivi de pension n'est disponible qu'avec l'abonnement.",
    );
  }

  /** Reserve une fonctionnalite entierement au plan premium (aucun acces en gratuit). */
  private async assertPremiumFeature(
    householdId: number,
    code: PlanLimitCode,
    message: string,
  ): Promise<void> {
    const isPremium =
      await this.subscriptionsService.isHouseholdPremium(householdId);
    if (!isPremium) {
      throw new PlanLimitException(code, message);
    }
  }

  async assertCanUseReports(householdId: number): Promise<void> {
    await this.assertPremiumFeature(
      householdId,
      'PLAN_LIMIT_REPORTS',
      "L'historique consolide des comptes-rendus n'est disponible qu'avec l'abonnement.",
    );
  }

  async assertCanUseBudget(householdId: number): Promise<void> {
    await this.assertPremiumFeature(
      householdId,
      'PLAN_LIMIT_BUDGET',
      "Le suivi budgetaire n'est disponible qu'avec l'abonnement.",
    );
  }

  async assertCanUseRidingSessions(householdId: number): Promise<void> {
    await this.assertPremiumFeature(
      householdId,
      'PLAN_LIMIT_RIDING_SESSIONS',
      "Les seances chevaux ne sont disponibles qu'avec l'abonnement.",
    );
  }

  async assertCanUseProviderMap(householdId: number): Promise<void> {
    await this.assertPremiumFeature(
      householdId,
      'PLAN_LIMIT_PROVIDER_MAP',
      "La carte interactive des intervenants n'est disponible qu'avec l'abonnement.",
    );
  }

  /** Date plancher du carnet de sante visible en gratuit, ou null si aucun filtre (premium). */
  async getHealthHistoryFloorDate(householdId: number): Promise<Date | null> {
    const isPremium =
      await this.subscriptionsService.isHouseholdPremium(householdId);
    if (isPremium) {
      return null;
    }
    const floor = new Date();
    floor.setUTCMonth(floor.getUTCMonth() - FREE_PLAN_HEALTH_HISTORY_MONTHS);
    return floor;
  }

  /** Decalages (en jours avant l'echeance) auxquels une notification push doit etre envoyee. */
  async getNotificationOffsets(householdId: number): Promise<number[]> {
    const isPremium =
      await this.subscriptionsService.isHouseholdPremium(householdId);
    return isPremium
      ? PREMIUM_NOTIFICATION_OFFSETS
      : FREE_PLAN_NOTIFICATION_OFFSETS;
  }
}
