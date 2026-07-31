import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import {
  AnimalsRepository,
  type Animal,
  type AnimalInput,
} from './animals.repository';
import { HouseholdsRepository } from '../households/households.repository';
import { calculateAge } from './age.util';

@Injectable()
export class AnimalsService {
  constructor(
    private readonly animalsRepository: AnimalsRepository,
    private readonly householdsRepository: HouseholdsRepository,
  ) {}

  async listForHousehold(userId: number, householdId: number) {
    await this.assertMember(userId, householdId);
    const animals = await this.animalsRepository.findByHousehold(householdId);
    return animals.map(withAge);
  }

  async create(userId: number, householdId: number, input: AnimalInput) {
    await this.assertMember(userId, householdId);
    const animal = await this.animalsRepository.create(householdId, input);
    return withAge(animal);
  }

  async getForUser(userId: number, animalId: number) {
    const animal = await this.findAndAssertAccess(userId, animalId);
    return withAge(animal);
  }

  async update(userId: number, animalId: number, input: Partial<AnimalInput>) {
    await this.findAndAssertAccess(userId, animalId);
    const updated = await this.animalsRepository.update(animalId, input);
    return withAge(updated!);
  }

  async delete(userId: number, animalId: number): Promise<void> {
    await this.findAndAssertAccess(userId, animalId);
    await this.animalsRepository.delete(animalId);
  }

  async setPhoto(userId: number, animalId: number, filePath: string) {
    const animal = await this.findAndAssertAccess(userId, animalId);
    if (animal.photoUrl) {
      await unlink(animal.photoUrl).catch(() => undefined);
    }
    const updated = await this.animalsRepository.update(animalId, {
      photoUrl: filePath,
    });
    return withAge(updated!);
  }

  async getPhotoPath(userId: number, animalId: number): Promise<string> {
    const animal = await this.findAndAssertAccess(userId, animalId);
    if (!animal.photoUrl) {
      throw new NotFoundException("Cet animal n'a pas de photo");
    }
    return animal.photoUrl;
  }

  /** Utilise par les autres modules (sante, documents) pour verifier l'acces avant toute operation liee a un animal. */
  async findAndAssertAccess(userId: number, animalId: number): Promise<Animal> {
    const animal = await this.animalsRepository.findById(animalId);
    if (!animal) {
      throw new NotFoundException('Animal introuvable');
    }
    await this.assertMember(userId, animal.householdId);
    return animal;
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

function withAge(animal: Animal) {
  return {
    ...animal,
    age: animal.birthDate ? calculateAge(new Date(animal.birthDate)) : null,
  };
}
