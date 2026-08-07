import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnimalsService } from '../animals/animals.service';
import { AnimalProvidersRepository } from './animal-providers.repository';
import { ProvidersRepository } from './providers.repository';

@Injectable()
export class AnimalProvidersService {
  constructor(
    private readonly animalsService: AnimalsService,
    private readonly animalProvidersRepository: AnimalProvidersRepository,
    private readonly providersRepository: ProvidersRepository,
  ) {}

  async list(userId: number, animalId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.animalProvidersRepository.findByAnimal(animalId);
  }

  async link(userId: number, animalId: number, providerId: number) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    const provider = await this.providersRepository.findById(providerId);
    if (!provider) {
      throw new NotFoundException('Intervenant introuvable');
    }
    if (provider.householdId !== animal.householdId) {
      throw new BadRequestException(
        "Cet intervenant n'appartient pas au foyer de l'animal",
      );
    }
    await this.animalProvidersRepository.link(animalId, providerId);
    return this.animalProvidersRepository.findByAnimal(animalId);
  }

  async unlink(userId: number, animalId: number, providerId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    await this.animalProvidersRepository.unlink(animalId, providerId);
  }
}
