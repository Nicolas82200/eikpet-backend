import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { AnimalsModule } from '../animals/animals.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ProvidersModule } from '../providers/providers.module';
import { HealthController } from './health.controller';
import { EmergencyShareController } from './emergency-share.controller';
import { HealthService } from './health.service';
import { RemindersService } from './reminders.service';
import { MedicalProfileRepository } from './repositories/medical-profile.repository';
import { TreatmentsRepository } from './repositories/treatments.repository';
import { SurgicalHistoryRepository } from './repositories/surgical-history.repository';
import { HealthEntriesRepository } from './repositories/health-entries.repository';
import { EmergencyShareRepository } from './repositories/emergency-share.repository';

@Module({
  imports: [TokenModule, AnimalsModule, SubscriptionsModule, ProvidersModule],
  controllers: [HealthController, EmergencyShareController],
  providers: [
    HealthService,
    RemindersService,
    MedicalProfileRepository,
    TreatmentsRepository,
    SurgicalHistoryRepository,
    HealthEntriesRepository,
    EmergencyShareRepository,
  ],
  exports: [RemindersService, HealthEntriesRepository],
})
export class HealthModule {}
