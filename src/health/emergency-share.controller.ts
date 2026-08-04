import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';
import {
  renderEmergencySheetErrorHtml,
  renderEmergencySheetHtml,
} from './emergency-sheet.view';

/**
 * Consultation d'une fiche d'urgence partagee temporairement (pet-sitter) : volontairement
 * sans JwtAuthGuard, le lien lui-meme (token long, aleatoire, a duree de vie limitee) fait
 * office d'autorisation. Rendu en HTML (pas JSON) car ce lien est destine a etre ouvert dans
 * un navigateur par une personne qui n'a pas l'application. Cf. HealthService.getEmergencySheetByToken.
 */
@Controller('emergency-sheet/shared')
export class EmergencyShareController {
  constructor(private readonly healthService: HealthService) {}

  @Get(':token')
  async getSharedEmergencySheet(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    try {
      const sheet = await this.healthService.getEmergencySheetByToken(token);
      res.type('html').send(renderEmergencySheetHtml(sheet));
    } catch (error) {
      if (error instanceof NotFoundException) {
        res
          .status(404)
          .type('html')
          .send(
            renderEmergencySheetErrorHtml('Ce lien est invalide ou a expire.'),
          );
        return;
      }
      throw error;
    }
  }
}
