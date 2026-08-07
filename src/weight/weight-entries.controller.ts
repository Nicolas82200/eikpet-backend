import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { WeightEntriesService } from './weight-entries.service';
import { CreateWeightEntryDto } from './dto/create-weight-entry.dto';

@Controller('animals/:animalId/weight-entries')
@UseGuards(JwtAuthGuard)
export class WeightEntriesController {
  constructor(private readonly weightEntriesService: WeightEntriesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.weightEntriesService.list(user.id, animalId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Body() dto: CreateWeightEntryDto,
  ) {
    return this.weightEntriesService.create(user.id, animalId, dto);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.weightEntriesService.delete(user.id, animalId, id);
  }
}
