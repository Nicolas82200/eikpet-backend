import { ForbiddenException, Injectable } from '@nestjs/common';
import { HouseholdsRepository } from '../households/households.repository';
import { HealthEntriesRepository } from '../health/repositories/health-entries.repository';

@Injectable()
export class CalendarService {
  constructor(
    private readonly householdsRepository: HouseholdsRepository,
    private readonly healthEntriesRepository: HealthEntriesRepository,
  ) {}

  async listUpcoming(userId: number, householdId: number) {
    const isMember = await this.householdsRepository.isMember(
      householdId,
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'appartenez pas a ce foyer");
    }
    return this.healthEntriesRepository.findUpcomingForHousehold(householdId);
  }
}
