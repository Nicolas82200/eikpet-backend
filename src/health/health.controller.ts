import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { HealthService } from './health.service';
import { UpsertMedicalProfileDto } from './dto/upsert-medical-profile.dto';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { CreateSurgicalHistoryDto } from './dto/create-surgical-history.dto';
import { CreateHealthEntryDto } from './dto/create-health-entry.dto';
import { UpdateHealthEntryDto } from './dto/update-health-entry.dto';

@Controller('animals/:animalId')
@UseGuards(JwtAuthGuard)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // --- Fiche medicale ---

  @Get('medical-profile')
  getMedicalProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.healthService.getMedicalProfile(user.id, animalId);
  }

  @Put('medical-profile')
  upsertMedicalProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Body() dto: UpsertMedicalProfileDto,
  ) {
    return this.healthService.upsertMedicalProfile(user.id, animalId, dto);
  }

  @Get('treatments')
  listTreatments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.healthService.listTreatments(user.id, animalId);
  }

  @Post('treatments')
  createTreatment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Body() dto: CreateTreatmentDto,
  ) {
    return this.healthService.createTreatment(user.id, animalId, dto);
  }

  @Delete('treatments/:treatmentId')
  deleteTreatment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Param('treatmentId', ParseIntPipe) treatmentId: number,
  ) {
    return this.healthService.deleteTreatment(user.id, animalId, treatmentId);
  }

  @Get('surgical-history')
  listSurgicalHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.healthService.listSurgicalHistory(user.id, animalId);
  }

  @Post('surgical-history')
  createSurgicalHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Body() dto: CreateSurgicalHistoryDto,
  ) {
    return this.healthService.createSurgicalHistory(user.id, animalId, dto);
  }

  @Delete('surgical-history/:entryId')
  deleteSurgicalHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Param('entryId', ParseIntPipe) entryId: number,
  ) {
    return this.healthService.deleteSurgicalHistory(user.id, animalId, entryId);
  }

  // --- Carnet de sante ---

  @Get('health-entries')
  listHealthEntries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.healthService.listHealthEntries(user.id, animalId);
  }

  @Post('health-entries')
  createHealthEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Body() dto: CreateHealthEntryDto,
  ) {
    return this.healthService.createHealthEntry(user.id, animalId, dto);
  }

  @Put('health-entries/:entryId')
  updateHealthEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Body() dto: UpdateHealthEntryDto,
  ) {
    return this.healthService.updateHealthEntry(
      user.id,
      animalId,
      entryId,
      dto,
    );
  }

  @Delete('health-entries/:entryId')
  deleteHealthEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
    @Param('entryId', ParseIntPipe) entryId: number,
  ) {
    return this.healthService.deleteHealthEntry(user.id, animalId, entryId);
  }
}
