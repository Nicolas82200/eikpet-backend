import { Injectable } from '@nestjs/common';

/**
 * Logique centralisee de calcul des rappels (vaccins, vermifuges, rdv...).
 * Ne pas dupliquer ce calcul ailleurs dans le code (cf. CLAUDE.md).
 */
@Injectable()
export class RemindersService {
  /**
   * scheduledDate est une date-only (ex: "2026-01-01"), parsee par `new Date()` en UTC minuit.
   * On doit rester en UTC tout du long : melanger UTC (parsing) et heure locale
   * (getMonth/setMonth) decale la date d'un jour, voire d'un mois, pres des bornes.
   */
  calculateNextReminderDate(
    scheduledDate: Date,
    recurrenceMonths?: number | null,
  ): Date | null {
    if (!recurrenceMonths || recurrenceMonths <= 0) {
      return null;
    }
    const next = new Date(scheduledDate);
    next.setUTCMonth(next.getUTCMonth() + recurrenceMonths);
    return next;
  }
}
