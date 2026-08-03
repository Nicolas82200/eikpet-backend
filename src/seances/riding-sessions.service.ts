import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnimalsService } from '../animals/animals.service';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';
import {
  RidingSessionsRepository,
  type RidingSessionInput,
} from './riding-sessions.repository';

/** 3.8 : les seances sont reservees aux chevaux (et poneys), cf. cahier des charges. */
const EQUINE_SPECIES = ['cheval', 'poney', 'pony'];

@Injectable()
export class RidingSessionsService {
  constructor(
    private readonly animalsService: AnimalsService,
    private readonly ridingSessionsRepository: RidingSessionsRepository,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async list(userId: number, animalId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.ridingSessionsRepository.findByAnimal(animalId);
  }

  async create(userId: number, animalId: number, input: RidingSessionInput) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    if (!EQUINE_SPECIES.includes(animal.species.trim().toLowerCase())) {
      throw new BadRequestException(
        'Les seances sont reservees aux chevaux et poneys',
      );
    }
    await this.planLimitsService.assertCanUseRidingSessions(animal.householdId);
    return this.ridingSessionsRepository.create(animalId, input);
  }

  async update(
    userId: number,
    animalId: number,
    sessionId: number,
    input: Partial<RidingSessionInput>,
  ) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    await this.planLimitsService.assertCanUseRidingSessions(animal.householdId);
    await this.getOwnedSession(animalId, sessionId);
    return this.ridingSessionsRepository.update(sessionId, input);
  }

  async delete(userId: number, animalId: number, sessionId: number) {
    const animal = await this.animalsService.findAndAssertAccess(
      userId,
      animalId,
    );
    await this.planLimitsService.assertCanUseRidingSessions(animal.householdId);
    await this.getOwnedSession(animalId, sessionId);
    await this.ridingSessionsRepository.delete(sessionId);
  }

  private async getOwnedSession(animalId: number, sessionId: number) {
    const session = await this.ridingSessionsRepository.findById(sessionId);
    if (!session || session.animalId !== animalId) {
      throw new NotFoundException('Seance introuvable');
    }
    return session;
  }
}
