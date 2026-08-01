import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { HouseholdsRepository } from './households.repository';
import { generateInviteCode } from './invite-code.util';
import { AnimalsRepository } from '../animals/animals.repository';
import { DocumentsRepository } from '../documents/documents.repository';

@Injectable()
export class HouseholdsService {
  constructor(
    private readonly householdsRepository: HouseholdsRepository,
    private readonly animalsRepository: AnimalsRepository,
    private readonly documentsRepository: DocumentsRepository,
  ) {}

  async createForUser(userId: number, name: string) {
    const household = await this.householdsRepository.create(
      name,
      generateInviteCode(),
    );
    await this.householdsRepository.addMember(household.id, userId, 'owner');
    return household;
  }

  async listForUser(userId: number) {
    return this.householdsRepository.listForUser(userId);
  }

  async getForUser(userId: number, householdId: number) {
    await this.assertMember(userId, householdId);
    const household = await this.householdsRepository.findById(householdId);
    if (!household) {
      throw new NotFoundException('Foyer introuvable');
    }
    return household;
  }

  async listMembers(userId: number, householdId: number) {
    await this.assertMember(userId, householdId);
    return this.householdsRepository.listMembers(householdId);
  }

  async regenerateInviteCode(userId: number, householdId: number) {
    await this.assertOwner(userId, householdId);
    const inviteCode = generateInviteCode();
    await this.householdsRepository.regenerateInviteCode(
      householdId,
      inviteCode,
    );
    return { inviteCode };
  }

  async rename(userId: number, householdId: number, name: string) {
    await this.assertOwner(userId, householdId);
    await this.householdsRepository.rename(householdId, name);
    return this.householdsRepository.findById(householdId);
  }

  async removeMember(
    userId: number,
    householdId: number,
    targetUserId: number,
  ): Promise<void> {
    await this.assertOwner(userId, householdId);
    if (targetUserId === userId) {
      throw new BadRequestException(
        'Le proprietaire ne peut pas se retirer lui-meme du foyer',
      );
    }
    await this.householdsRepository.removeMember(householdId, targetUserId);
  }

  async deleteHousehold(userId: number, householdId: number): Promise<void> {
    await this.assertOwner(userId, householdId);
    // Les lignes (membres, animaux, entrees de sante, documents...) sont supprimees par
    // cascade SQL, mais les fichiers sur disque ne le sont jamais automatiquement : on les
    // nettoie ici, avant la suppression, pour ne pas laisser de fichiers orphelins.
    const animals = await this.animalsRepository.findByHousehold(householdId);
    const documents =
      await this.documentsRepository.findByHousehold(householdId);
    await Promise.all([
      ...animals
        .filter((a) => a.photoUrl)
        .map((a) => unlink(a.photoUrl!).catch(() => undefined)),
      ...documents.map((doc) => unlink(doc.filePath).catch(() => undefined)),
    ]);
    await this.householdsRepository.delete(householdId);
  }

  async leave(userId: number, householdId: number): Promise<void> {
    const role = await this.householdsRepository.getRole(householdId, userId);
    if (!role) {
      throw new ForbiddenException("Vous n'appartenez pas a ce foyer");
    }
    if (role === 'owner') {
      throw new BadRequestException(
        'Le proprietaire ne peut pas quitter le foyer. Supprimez le foyer ou transferez la propriete.',
      );
    }
    await this.householdsRepository.removeMember(householdId, userId);
  }

  async assertMember(userId: number, householdId: number): Promise<void> {
    const isMember = await this.householdsRepository.isMember(
      householdId,
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'appartenez pas a ce foyer");
    }
  }

  private async assertOwner(
    userId: number,
    householdId: number,
  ): Promise<void> {
    const role = await this.householdsRepository.getRole(householdId, userId);
    if (role !== 'owner') {
      throw new ForbiddenException(
        'Seul le proprietaire du foyer peut faire cette action',
      );
    }
  }
}
