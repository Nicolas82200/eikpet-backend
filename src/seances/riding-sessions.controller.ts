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
import { RidingSessionsService } from './riding-sessions.service';
import { CreateRidingSessionDto } from './dto/create-riding-session.dto';
import { UpdateRidingSessionDto } from './dto/update-riding-session.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class RidingSessionsController {
  constructor(private readonly ridingSessionsService: RidingSessionsService) {}

  @Get('animals/:animalId/riding-sessions')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.ridingSessionsService.list(user.id, animalId);
  }

  @Post('animals/:animalId/riding-sessions')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Body() dto: CreateRidingSessionDto,
  ) {
    return this.ridingSessionsService.create(user.id, animalId, dto);
  }

  @Patch('animals/:animalId/riding-sessions/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRidingSessionDto,
  ) {
    return this.ridingSessionsService.update(user.id, animalId, id, dto);
  }

  @Delete('animals/:animalId/riding-sessions/:id')
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ridingSessionsService.delete(user.id, animalId, id);
  }
}
