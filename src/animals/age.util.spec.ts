import { calculateAge } from './age.util';

describe('calculateAge', () => {
  it('calcule un age exact en annees et mois', () => {
    const birthDate = new Date('2020-03-15');
    const now = new Date('2024-06-01');
    expect(calculateAge(birthDate, now)).toEqual({ years: 4, months: 2 });
  });

  it("gere le cas ou l'anniversaire du mois n'est pas encore passe", () => {
    const birthDate = new Date('2020-06-20');
    const now = new Date('2024-06-01');
    expect(calculateAge(birthDate, now)).toEqual({ years: 3, months: 11 });
  });

  it('renvoie 0/0 pour un nouveau-ne', () => {
    const birthDate = new Date('2024-06-01');
    const now = new Date('2024-06-01');
    expect(calculateAge(birthDate, now)).toEqual({ years: 0, months: 0 });
  });
});
