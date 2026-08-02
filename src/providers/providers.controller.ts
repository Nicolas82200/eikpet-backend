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
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('households/:householdId/providers')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', ParseIntPipe) householdId: number,
  ) {
    return this.providersService.listForHousehold(user.id, householdId);
  }

  @Post('households/:householdId/providers')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', ParseIntPipe) householdId: number,
    @Body() dto: CreateProviderDto,
  ) {
    return this.providersService.create(user.id, householdId, dto);
  }

  @Patch('providers/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.providersService.update(user.id, id, dto);
  }

  @Delete('providers/:id')
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.providersService.delete(user.id, id);
  }
}
