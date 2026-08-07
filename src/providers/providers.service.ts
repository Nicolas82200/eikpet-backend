import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProvidersRepository,
  type ProviderInput,
} from './providers.repository';
import { GeocodingService } from './geocoding.service';
import { HouseholdsRepository } from '../households/households.repository';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly providersRepository: ProvidersRepository,
    private readonly householdsRepository: HouseholdsRepository,
    private readonly geocodingService: GeocodingService,
    private readonly planLimitsService: PlanLimitsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async listForHousehold(userId: number, householdId: number) {
    await this.assertMember(userId, householdId);
    return this.providersRepository.findByHousehold(householdId);
  }

  /** 3.6 V3 : intervenants geocodes, pour la carte interactive (reserve a l'abonnement). */
  async listForMap(userId: number, householdId: number) {
    await this.assertMember(userId, householdId);
    await this.planLimitsService.assertCanUseProviderMap(householdId);
    const providers =
      await this.providersRepository.findByHousehold(householdId);
    return providers.filter((p) => p.latitude !== null && p.longitude !== null);
  }

  async create(userId: number, householdId: number, input: ProviderInput) {
    await this.assertMember(userId, householdId);
    const coordinates = await this.geocodeIfPremium(householdId, input.address);
    return this.providersRepository.create(householdId, {
      ...input,
      ...coordinates,
    });
  }

  async update(
    userId: number,
    providerId: number,
    input: Partial<ProviderInput>,
  ) {
    const provider = await this.findAndAssertAccess(userId, providerId);
    const coordinates = input.address
      ? await this.geocodeIfPremium(provider.householdId, input.address)
      : {};
    return this.providersRepository.update(provider.id, {
      ...input,
      ...coordinates,
    });
  }

  /** Ne geocode que pour un foyer premium : evite de consommer le quota Google Maps
   * pour une fonctionnalite (carte) reservee a l'abonnement. */
  private async geocodeIfPremium(householdId: number, address?: string | null) {
    if (!address) {
      return {};
    }
    const isPremium =
      await this.subscriptionsService.isHouseholdPremium(householdId);
    if (!isPremium) {
      return {};
    }
    const coordinates = await this.geocodingService.geocodeAddress(address);
    return coordinates
      ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
      : {};
  }

  async delete(userId: number, providerId: number): Promise<void> {
    const provider = await this.findAndAssertAccess(userId, providerId);
    await this.providersRepository.delete(provider.id);
  }

  private async findAndAssertAccess(userId: number, providerId: number) {
    const provider = await this.providersRepository.findById(providerId);
    if (!provider) {
      throw new NotFoundException('Intervenant introuvable');
    }
    await this.assertMember(userId, provider.householdId);
    return provider;
  }

  private async assertMember(
    userId: number,
    householdId: number,
  ): Promise<void> {
    const isMember = await this.householdsRepository.isMember(
      householdId,
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'appartenez pas a ce foyer");
    }
  }
}
