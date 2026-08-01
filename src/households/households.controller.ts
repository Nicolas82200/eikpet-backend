import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { RenameHouseholdDto } from './dto/rename-household.dto';

@Controller('households')
@UseGuards(JwtAuthGuard)
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHouseholdDto,
  ) {
    return this.householdsService.createForUser(user.id, dto.name);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.householdsService.listForUser(user.id);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.householdsService.getForUser(user.id, id);
  }

  @Get(':id/members')
  listMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.householdsService.listMembers(user.id, id);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenameHouseholdDto,
  ) {
    return this.householdsService.rename(user.id, id, dto.name);
  }

  @Post(':id/invite-code/regenerate')
  regenerateInviteCode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.householdsService.regenerateInviteCode(user.id, id);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ) {
    return this.householdsService.removeMember(user.id, id, targetUserId);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.householdsService.leave(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteHousehold(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.householdsService.deleteHousehold(user.id, id);
  }
}
