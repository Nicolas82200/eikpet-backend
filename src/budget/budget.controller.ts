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
import { BudgetService } from './budget.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get('animals/:animalId/budget')
  getAnimalBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.budgetService.getAnimalBudget(user.id, animalId);
  }

  @Get('households/:householdId/budget')
  getHouseholdBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', ParseIntPipe) householdId: number,
  ) {
    return this.budgetService.getHouseholdBudget(user.id, householdId);
  }
}
