import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProvidersRepository,
  type ProviderInput,
} from './providers.repository';
import { HouseholdsRepository } from '../households/households.repository';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly providersRepository: ProvidersRepository,
    private readonly householdsRepository: HouseholdsRepository,
  ) {}

  async listForHousehold(userId: number, householdId: number) {
    await this.assertMember(userId, householdId);
    return this.providersRepository.findByHousehold(householdId);
  }

  async create(userId: number, householdId: number, input: ProviderInput) {
    await this.assertMember(userId, householdId);
    return this.providersRepository.create(householdId, input);
  }

  async update(
    userId: number,
    providerId: number,
    input: Partial<ProviderInput>,
  ) {
    const provider = await this.findAndAssertAccess(userId, providerId);
    return this.providersRepository.update(provider.id, input);
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
