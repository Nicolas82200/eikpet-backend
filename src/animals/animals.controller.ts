import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { AnimalsService } from './animals.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

  @Get('households/:householdId/animals')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', ParseIntPipe) householdId: number,
  ) {
    return this.animalsService.listForHousehold(user.id, householdId);
  }

  @Post('households/:householdId/animals')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', ParseIntPipe) householdId: number,
    @Body() dto: CreateAnimalDto,
  ) {
    return this.animalsService.create(user.id, householdId, dto);
  }

  @Get('animals/:id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.animalsService.getForUser(user.id, id);
  }

  @Patch('animals/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnimalDto,
  ) {
    return this.animalsService.update(user.id, id, dto);
  }

  @Delete('animals/:id')
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.animalsService.delete(user.id, id);
  }
}
