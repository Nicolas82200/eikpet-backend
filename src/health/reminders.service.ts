import { Injectable } from '@nestjs/common';

export interface VaccinationScheduleStep {
  label: string;
  targetDate: string;
}

/** Chiens et chats uniquement : la primo-vaccination equine suit un protocole different, hors perimetre ici. */
const PUPPY_KITTEN_SPECIES = ['chien', 'chat'];

/**
 * Protocole standard de primo-vaccination chiot/chaton (source : Point Veterinaire,
 * protocole 2018) : 3 injections espacees de 4 semaines entre 8 et 16 semaines, puis
 * un premier rappel un an apres la derniere injection.
 */
const PRIMO_VACCINATION_AGE_WEEKS = [8, 12, 16];
const FIRST_BOOSTER_WEEKS_AFTER_LAST_INJECTION = 52;

/** Au-dela de cet age, le chiot/chaton est considere hors primo-vaccination : plus de suggestion. */
const MAX_AGE_WEEKS_FOR_SUGGESTION = 20;

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

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

  /**
   * Suggere le calendrier de primo-vaccination (chiot/chaton) en fonction de l'age de
   * l'animal : 3 injections a 8/12/16 semaines puis premier rappel annuel. Ne renvoie
   * rien pour les especes hors chien/chat, ni pour un animal deja adulte (l'echeancier
   * annuel classique du carnet de sante prend alors le relais via recurrenceMonths).
   */
  getSuggestedVaccinationSchedule(
    species: string,
    birthDate: string | null,
    now: Date = new Date(),
  ): VaccinationScheduleStep[] | null {
    if (!birthDate) {
      return null;
    }
    const normalizedSpecies = species.trim().toLowerCase();
    if (!PUPPY_KITTEN_SPECIES.includes(normalizedSpecies)) {
      return null;
    }

    const birth = new Date(`${birthDate.slice(0, 10)}T00:00:00Z`);
    const ageWeeks = Math.floor(
      (now.getTime() - birth.getTime()) / MS_PER_WEEK,
    );
    if (ageWeeks < 0 || ageWeeks > MAX_AGE_WEEKS_FOR_SUGGESTION) {
      return null;
    }

    const animalLabel = normalizedSpecies === 'chien' ? 'chiot' : 'chaton';
    const steps = PRIMO_VACCINATION_AGE_WEEKS.map((weeks, index) => ({
      label: `Primo-vaccination ${animalLabel} — injection ${index + 1}/${PRIMO_VACCINATION_AGE_WEEKS.length}`,
      targetDate: addWeeksAsIsoDate(birth, weeks),
    }));

    const lastInjectionWeek =
      PRIMO_VACCINATION_AGE_WEEKS[PRIMO_VACCINATION_AGE_WEEKS.length - 1];
    steps.push({
      label: 'Premier rappel annuel',
      targetDate: addWeeksAsIsoDate(
        birth,
        lastInjectionWeek + FIRST_BOOSTER_WEEKS_AFTER_LAST_INJECTION,
      ),
    });

    return steps;
  }
}

function addWeeksAsIsoDate(birth: Date, weeks: number): string {
  const target = new Date(birth);
  target.setUTCDate(target.getUTCDate() + weeks * 7);
  return target.toISOString().slice(0, 10);
}
