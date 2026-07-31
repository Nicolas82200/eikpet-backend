import { Module } from '@nestjs/common';
import { TokenModule } from '../auth/token.module';
import { HouseholdsModule } from '../households/households.module';
import { HealthModule } from '../health/health.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [TokenModule, HouseholdsModule, HealthModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
