import {
  computeNextDueDate,
  countElapsedOccurrences,
  type RecurrenceFields,
} from './boarding-schedule.util';

function fields(overrides: Partial<RecurrenceFields>): RecurrenceFields {
  return {
    periodicity: 'mensuel',
    startDate: null,
    dayOfMonth: null,
    recurrenceMonth: null,
    recurrenceDay: null,
    dayOfWeek: null,
    ...overrides,
  };
}

describe('computeNextDueDate', () => {
  it('renvoie null pour une periodicite unique', () => {
    expect(
      computeNextDueDate(
        fields({ periodicity: 'unique', startDate: '2024-01-10' }),
      ),
    ).toBeNull();
  });

  it('mensuel : renvoie le prochain 10 du mois', () => {
    const from = new Date('2024-06-05');
    const result = computeNextDueDate(
      fields({
        periodicity: 'mensuel',
        startDate: '2024-01-10',
        dayOfMonth: 10,
      }),
      from,
    );
    expect(result).toBe('2024-06-10');
  });

  it('mensuel : passe au mois suivant si le jour est deja passe', () => {
    const from = new Date('2024-06-15');
    const result = computeNextDueDate(
      fields({
        periodicity: 'mensuel',
        startDate: '2024-01-10',
        dayOfMonth: 10,
      }),
      from,
    );
    expect(result).toBe('2024-07-10');
  });

  it('mensuel : clampe le jour sur les mois courts (ex: 31 -> 28/29 fevrier)', () => {
    const from = new Date('2024-02-01');
    const result = computeNextDueDate(
      fields({
        periodicity: 'mensuel',
        startDate: '2024-01-31',
        dayOfMonth: 31,
      }),
      from,
    );
    expect(result).toBe('2024-02-29');
  });

  it('annuel : renvoie la prochaine occurrence du 10/02', () => {
    const from = new Date('2024-01-01');
    const result = computeNextDueDate(
      fields({
        periodicity: 'annuel',
        startDate: '2020-02-10',
        recurrenceMonth: 2,
        recurrenceDay: 10,
      }),
      from,
    );
    expect(result).toBe('2024-02-10');
  });

  it('annuel : passe a l annee suivante si la date est deja passee', () => {
    const from = new Date('2024-03-01');
    const result = computeNextDueDate(
      fields({
        periodicity: 'annuel',
        startDate: '2020-02-10',
        recurrenceMonth: 2,
        recurrenceDay: 10,
      }),
      from,
    );
    expect(result).toBe('2025-02-10');
  });

  it('hebdomadaire : renvoie le prochain jour de la semaine choisi (mercredi = 2)', () => {
    const from = new Date('2024-06-03'); // lundi
    const result = computeNextDueDate(
      fields({
        periodicity: 'hebdomadaire',
        startDate: '2024-01-01',
        dayOfWeek: 2,
      }),
      from,
    );
    expect(result).toBe('2024-06-05');
  });
});

describe('countElapsedOccurrences', () => {
  it('unique : toujours 1 occurrence', () => {
    expect(countElapsedOccurrences(fields({ periodicity: 'unique' }))).toBe(1);
  });

  it('mensuel : compte les mois echus depuis le debut', () => {
    const asOf = new Date('2024-06-15');
    const result = countElapsedOccurrences(
      fields({
        periodicity: 'mensuel',
        startDate: '2024-01-10',
        dayOfMonth: 10,
      }),
      asOf,
    );
    expect(result).toBe(6); // jan, fev, mars, avr, mai, juin (10 deja passe)
  });

  it('mensuel : n exclut pas le mois en cours si le jour n est pas encore passe', () => {
    const asOf = new Date('2024-06-05');
    const result = countElapsedOccurrences(
      fields({
        periodicity: 'mensuel',
        startDate: '2024-01-10',
        dayOfMonth: 10,
      }),
      asOf,
    );
    expect(result).toBe(5); // juin pas encore du
  });

  it('annuel : compte les annees echues', () => {
    const asOf = new Date('2024-03-01');
    const result = countElapsedOccurrences(
      fields({
        periodicity: 'annuel',
        startDate: '2020-02-10',
        recurrenceMonth: 2,
        recurrenceDay: 10,
      }),
      asOf,
    );
    expect(result).toBe(5); // 2020, 2021, 2022, 2023, 2024
  });

  it('hebdomadaire : compte les semaines echues', () => {
    const asOf = new Date('2024-01-22'); // 3 semaines apres le 1er janvier
    const result = countElapsedOccurrences(
      fields({
        periodicity: 'hebdomadaire',
        startDate: '2024-01-01',
        dayOfWeek: 0,
      }),
      asOf,
    );
    expect(result).toBe(4);
  });

  it('renvoie 0 avant la date de depart', () => {
    const asOf = new Date('2023-12-01');
    const result = countElapsedOccurrences(
      fields({
        periodicity: 'mensuel',
        startDate: '2024-01-10',
        dayOfMonth: 10,
      }),
      asOf,
    );
    expect(result).toBe(0);
  });
});
