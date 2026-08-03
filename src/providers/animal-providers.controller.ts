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
import { AnimalProvidersService } from './animal-providers.service';
import { LinkAnimalProviderDto } from './dto/link-animal-provider.dto';

@Controller('animals/:animalId/providers')
@UseGuards(JwtAuthGuard)
export class AnimalProvidersController {
  constructor(
    private readonly animalProvidersService: AnimalProvidersService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.animalProvidersService.list(user.id, animalId);
  }

  @Post()
  link(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Body() dto: LinkAnimalProviderDto,
  ) {
    return this.animalProvidersService.link(user.id, animalId, dto.providerId);
  }

  @Delete(':providerId')
  unlink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Param('providerId', ParseIntPipe) providerId: number,
  ) {
    return this.animalProvidersService.unlink(user.id, animalId, providerId);
  }
}
