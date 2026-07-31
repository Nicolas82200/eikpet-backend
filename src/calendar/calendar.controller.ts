import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';

@Controller('households/:householdId/calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  listUpcoming(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', ParseIntPipe) householdId: number,
  ) {
    return this.calendarService.listUpcoming(user.id, householdId);
  }
}
