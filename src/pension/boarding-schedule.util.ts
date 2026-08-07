export type BoardingPeriodicity =
  'unique' | 'hebdomadaire' | 'mensuel' | 'annuel';

export interface RecurrenceFields {
  periodicity: BoardingPeriodicity;
  /** AAAA-MM-JJ : date de depart de la recurrence ("depuis quand"), inutilise pour 'unique'. */
  startDate: string | null;
  /** Jour du mois (1-31), pour 'mensuel'. */
  dayOfMonth: number | null;
  /** Mois (1-12) de l'echeance annuelle, pour 'annuel'. */
  recurrenceMonth: number | null;
  /** Jour du mois de l'echeance annuelle, pour 'annuel'. */
  recurrenceDay: number | null;
  /** Jour de la semaine (0 = lundi ... 6 = dimanche), pour 'hebdomadaire'. */
  dayOfWeek: number | null;
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function midnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampDayOfMonth(year: number, month0: number, day: number): number {
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  return Math.min(day, daysInMonth);
}

/**
 * Prochaine echeance a partir de `from` (aujourd'hui par defaut), pour les periodicites recurrentes.
 * Renvoie null pour 'unique' (l'echeance unique est saisie directement) ou si les champs de
 * recurrence necessaires sont absents.
 */
export function computeNextDueDate(
  fields: RecurrenceFields,
  from: Date = new Date(),
): string | null {
  const {
    periodicity,
    startDate,
    dayOfMonth,
    recurrenceMonth,
    recurrenceDay,
    dayOfWeek,
  } = fields;
  if (periodicity === 'unique' || !startDate) return null;

  const start = midnight(new Date(`${startDate}T00:00:00`));
  const fromMidnight = midnight(from);

  if (periodicity === 'mensuel' && dayOfMonth) {
    let year = start.getFullYear();
    let month = start.getMonth();
    let candidate = new Date(
      year,
      month,
      clampDayOfMonth(year, month, dayOfMonth),
    );
    while (candidate < start || candidate < fromMidnight) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      candidate = new Date(
        year,
        month,
        clampDayOfMonth(year, month, dayOfMonth),
      );
    }
    return isoDate(candidate);
  }

  if (periodicity === 'annuel' && recurrenceMonth && recurrenceDay) {
    let year = start.getFullYear();
    let candidate = new Date(year, recurrenceMonth - 1, recurrenceDay);
    while (candidate < start || candidate < fromMidnight) {
      year += 1;
      candidate = new Date(year, recurrenceMonth - 1, recurrenceDay);
    }
    return isoDate(candidate);
  }

  if (
    periodicity === 'hebdomadaire' &&
    dayOfWeek !== null &&
    dayOfWeek !== undefined
  ) {
    const startWeekday = (start.getDay() + 6) % 7; // 0 = lundi
    const diff = (dayOfWeek - startWeekday + 7) % 7;
    const candidate = new Date(start);
    candidate.setDate(candidate.getDate() + diff);
    while (candidate < fromMidnight) {
      candidate.setDate(candidate.getDate() + 7);
    }
    return isoDate(candidate);
  }

  return null;
}

/**
 * Nombre de cycles echus (dus) entre `startDate` et `asOf` inclus, utilise pour calculer le
 * montant deja du sur une echeance recurrente (budget = prix x occurrences).
 */
export function countElapsedOccurrences(
  fields: RecurrenceFields,
  asOf: Date = new Date(),
): number {
  const { periodicity, startDate } = fields;
  if (periodicity === 'unique') return 1;
  if (!startDate) return 0;

  const start = midnight(new Date(`${startDate}T00:00:00`));
  const asOfMidnight = midnight(asOf);
  if (asOfMidnight < start) return 0;

  if (periodicity === 'mensuel') {
    const dayOfMonth = fields.dayOfMonth ?? start.getDate();
    let months =
      (asOfMidnight.getFullYear() - start.getFullYear()) * 12 +
      (asOfMidnight.getMonth() - start.getMonth());
    const candidateThisMonth = clampDayOfMonth(
      asOfMidnight.getFullYear(),
      asOfMidnight.getMonth(),
      dayOfMonth,
    );
    if (asOfMidnight.getDate() < candidateThisMonth) months -= 1;
    return Math.max(0, months + 1);
  }

  if (periodicity === 'annuel') {
    const recurrenceMonth0 =
      (fields.recurrenceMonth ?? start.getMonth() + 1) - 1;
    const recurrenceDay = fields.recurrenceDay ?? start.getDate();
    let years = asOfMidnight.getFullYear() - start.getFullYear();
    const candidateThisYear = new Date(
      asOfMidnight.getFullYear(),
      recurrenceMonth0,
      recurrenceDay,
    );
    if (asOfMidnight < candidateThisYear) years -= 1;
    return Math.max(0, years + 1);
  }

  if (periodicity === 'hebdomadaire') {
    const diffDays = Math.floor(
      (asOfMidnight.getTime() - start.getTime()) / 86400000,
    );
    return Math.max(0, Math.floor(diffDays / 7) + 1);
  }

  return 0;
}
