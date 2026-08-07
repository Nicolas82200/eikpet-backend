import { RemindersService } from './reminders.service';

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

describe('RemindersService', () => {
  const service = new RemindersService();

  describe('calculateNextReminderDate', () => {
    it('renvoie null sans recurrence', () => {
      expect(
        service.calculateNextReminderDate(new Date('2026-01-01')),
      ).toBeNull();
    });

    it('ajoute le nombre de mois demande', () => {
      const next = service.calculateNextReminderDate(new Date('2026-01-01'), 3);
      expect(next?.toISOString().slice(0, 10)).toBe('2026-04-01');
    });
  });

  describe('getSuggestedVaccinationSchedule', () => {
    const birthDate = '2026-01-01';
    const now = new Date('2026-03-01'); // ~8-9 semaines apres la naissance

    it('renvoie le protocole en 3 injections + 1er rappel pour un chiot', () => {
      const schedule = service.getSuggestedVaccinationSchedule(
        'Chien',
        birthDate,
        now,
      );
      expect(schedule).toHaveLength(4);
      expect(schedule![0].targetDate).toBe(addDaysIso(birthDate, 8 * 7));
      expect(schedule![1].targetDate).toBe(addDaysIso(birthDate, 12 * 7));
      expect(schedule![2].targetDate).toBe(addDaysIso(birthDate, 16 * 7));
      expect(schedule![3].label).toBe('Premier rappel annuel');
      expect(schedule![3].targetDate).toBe(
        addDaysIso(birthDate, (16 + 52) * 7),
      );
    });

    it('renvoie le protocole pour un chaton (espece insensible a la casse)', () => {
      const schedule = service.getSuggestedVaccinationSchedule(
        'chat',
        birthDate,
        now,
      );
      expect(schedule).toHaveLength(4);
      expect(schedule![0].label).toContain('chaton');
    });

    it('renvoie null pour une espece hors chien/chat', () => {
      expect(
        service.getSuggestedVaccinationSchedule('Cheval', birthDate, now),
      ).toBeNull();
    });

    it('renvoie null sans date de naissance', () => {
      expect(
        service.getSuggestedVaccinationSchedule('Chien', null, now),
      ).toBeNull();
    });

    it('renvoie null pour un chien deja adulte', () => {
      const adultNow = new Date('2027-01-01');
      expect(
        service.getSuggestedVaccinationSchedule('Chien', birthDate, adultNow),
      ).toBeNull();
    });
  });
});
