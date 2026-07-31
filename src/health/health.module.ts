import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { AnimalsModule } from '../animals/animals.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RemindersService } from './reminders.service';
import { MedicalProfileRepository } from './repositories/medical-profile.repository';
import { TreatmentsRepository } from './repositories/treatments.repository';
import { SurgicalHistoryRepository } from './repositories/surgical-history.repository';
import { HealthEntriesRepository } from './repositories/health-entries.repository';

@Module({
  imports: [TokenModule, AnimalsModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    RemindersService,
    MedicalProfileRepository,
    TreatmentsRepository,
    SurgicalHistoryRepository,
    HealthEntriesRepository,
  ],
  exports: [RemindersService, HealthEntriesRepository],
})
export class HealthModule {}
