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
import { BoardingsService } from './boardings.service';
import { CreateBoardingDto } from './dto/create-boarding.dto';
import { UpdateBoardingDto } from './dto/update-boarding.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class BoardingsController {
  constructor(private readonly boardingsService: BoardingsService) {}

  @Get('animals/:animalId/boardings')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.boardingsService.list(user.id, animalId);
  }

  @Post('animals/:animalId/boardings')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Body() dto: CreateBoardingDto,
  ) {
    return this.boardingsService.create(user.id, animalId, dto);
  }

  @Patch('animals/:animalId/boardings/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBoardingDto,
  ) {
    return this.boardingsService.update(user.id, animalId, id, dto);
  }

  @Delete('animals/:animalId/boardings/:id')
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.boardingsService.delete(user.id, animalId, id);
  }
}
