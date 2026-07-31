import { Injectable } from '@nestjs/common';

/**
 * Logique centralisee de calcul des rappels (vaccins, vermifuges, rdv...).
 * Ne pas dupliquer ce calcul ailleurs dans le code (cf. CLAUDE.md).
 */
@Injectable()
export class RemindersService {
  calculateNextReminderDate(
    scheduledDate: Date,
    recurrenceMonths?: number | null,
  ): Date | null {
    if (!recurrenceMonths || recurrenceMonths <= 0) {
      return null;
    }
    const next = new Date(scheduledDate);
    next.setMonth(next.getMonth() + recurrenceMonths);
    return next;
  }

  /** Decalages (en jours avant l'echeance) auxquels une notification push doit etre envoyee. */
  getNotificationOffsets(): number[] {
    return [7, 1, 0];
  }
}
