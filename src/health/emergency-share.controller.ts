import { Controller, Get, Param } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * Consultation d'une fiche d'urgence partagee temporairement (pet-sitter) : volontairement
 * sans JwtAuthGuard, le lien lui-meme (token long, aleatoire, a duree de vie limitee) fait
 * office d'autorisation. Cf. HealthService.getEmergencySheetByToken pour la validation.
 */
@Controller('emergency-sheet/shared')
export class EmergencyShareController {
  constructor(private readonly healthService: HealthService) {}

  @Get(':token')
  getSharedEmergencySheet(@Param('token') token: string) {
    return this.healthService.getEmergencySheetByToken(token);
  }
}
