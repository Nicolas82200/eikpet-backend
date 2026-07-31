import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HouseholdsRepository } from './households.repository';
import { generateInviteCode } from './invite-code.util';

@Injectable()
export class HouseholdsService {
  constructor(private readonly householdsRepository: HouseholdsRepository) {}

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
    await this.assertMember(userId, householdId);
    const inviteCode = generateInviteCode();
    await this.householdsRepository.regenerateInviteCode(
      householdId,
      inviteCode,
    );
    return { inviteCode };
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
}
