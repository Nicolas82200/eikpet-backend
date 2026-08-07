import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, uniqueEmail } from './utils/test-app';
import { activatePremium } from './utils/subscriptions';

async function registerWithAnimal(app: INestApplication<App>, prefix: string) {
  const auth = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email: uniqueEmail(prefix),
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      householdName: `Foyer ${prefix}`,
    })
    .expect(201);

  const households = await request(app.getHttpServer())
    .get('/households')
    .set('Authorization', `Bearer ${auth.body.accessToken}`)
    .expect(200);
  const householdId = households.body[0].id;

  const animal = await request(app.getHttpServer())
    .post(`/households/${householdId}/animals`)
    .set('Authorization', `Bearer ${auth.body.accessToken}`)
    .send({ name: 'Patient', species: 'Chien' })
    .expect(201);

  return {
    accessToken: auth.body.accessToken as string,
    householdId,
    animalId: animal.body.id as number,
  };
}

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("assemble la fiche d'urgence (profil, traitements, intervenants), sans limite de plan", async () => {
    const { accessToken, householdId, animalId } = await registerWithAnimal(
      app,
      'emergency',
    );

    await request(app.getHttpServer())
      .put(`/animals/${animalId}/medical-profile`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ allergies: 'Pollen', referringVetName: 'Dr Martin' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/animals/${animalId}/treatments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Anti-inflammatoire', dosage: '1cp/jour' })
      .expect(201);

    const provider = await request(app.getHttpServer())
      .post(`/households/${householdId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'veto', name: 'Clinique du Parc', phone: '0102030405' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/animals/${animalId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ providerId: provider.body.id })
      .expect(201);

    const sheet = await request(app.getHttpServer())
      .get(`/animals/${animalId}/emergency-sheet`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(sheet.body.animal.name).toBe('Patient');
    expect(sheet.body.medicalProfile.allergies).toBe('Pollen');
    expect(sheet.body.treatments).toHaveLength(1);
    expect(sheet.body.providers).toHaveLength(1);
    expect(sheet.body.providers[0].name).toBe('Clinique du Parc');
  });

  it("genere un lien de partage temporaire pour la fiche d'urgence, consultable sans authentification, revocable", async () => {
    const { accessToken, animalId } = await registerWithAnimal(
      app,
      'emergency-share',
    );

    const link = await request(app.getHttpServer())
      .post(`/animals/${animalId}/emergency-sheet/share-links`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(201);

    expect(link.body.token).toBeTruthy();
    expect(link.body.id).toBeTruthy();

    const shared = await request(app.getHttpServer())
      .get(`/emergency-sheet/shared/${link.body.token}`)
      .expect(200);
    expect(shared.body.animal.name).toBe('Patient');

    const list = await request(app.getHttpServer())
      .get(`/animals/${animalId}/emergency-sheet/share-links`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(
        `/animals/${animalId}/emergency-sheet/share-links/${link.body.id}`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/emergency-sheet/shared/${link.body.token}`)
      .expect(404);

    const listAfter = await request(app.getHttpServer())
      .get(`/animals/${animalId}/emergency-sheet/share-links`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listAfter.body).toHaveLength(0);
  });

  it("refuse un token de partage invalide pour la fiche d'urgence", async () => {
    await request(app.getHttpServer())
      .get('/emergency-sheet/shared/token-invalide')
      .expect(404);
  });

  it('enregistre et relit la fiche medicale', async () => {
    const { accessToken, animalId } = await registerWithAnimal(app, 'medical');

    await request(app.getHttpServer())
      .put(`/animals/${animalId}/medical-profile`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ allergies: 'Poulet', bloodType: 'DEA 1.1' })
      .expect(200);

    const profile = await request(app.getHttpServer())
      .get(`/animals/${animalId}/medical-profile`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profile.body.allergies).toBe('Poulet');
    expect(profile.body.bloodType).toBe('DEA 1.1');
  });

  it('gere les traitements en cours (creation et suppression)', async () => {
    const { accessToken, animalId } = await registerWithAnimal(
      app,
      'treatment',
    );

    const created = await request(app.getHttpServer())
      .post(`/animals/${animalId}/treatments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Antibiotique', dosage: '1cp/jour' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/animals/${animalId}/treatments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/animals/${animalId}/treatments/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const listAfter = await request(app.getHttpServer())
      .get(`/animals/${animalId}/treatments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listAfter.body).toHaveLength(0);
  });

  it('suggere le protocole de primo-vaccination pour un chiot', async () => {
    const { accessToken, householdId } = await registerWithAnimal(
      app,
      'vaccin-schedule-chiot',
    );

    const tenWeeksAgo = new Date();
    tenWeeksAgo.setDate(tenWeeksAgo.getDate() - 10 * 7);
    const puppy = await request(app.getHttpServer())
      .post(`/households/${householdId}/animals`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Milo',
        species: 'Chien',
        birthDate: tenWeeksAgo.toISOString().slice(0, 10),
      })
      .expect(201);

    const schedule = await request(app.getHttpServer())
      .get(`/animals/${puppy.body.id}/vaccination-schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(schedule.body).toHaveLength(4);
    expect(schedule.body[3].label).toBe('Premier rappel annuel');
  });

  it('ne suggere aucun protocole pour un animal adulte ou hors chien/chat', async () => {
    const { accessToken, animalId } = await registerWithAnimal(
      app,
      'vaccin-schedule-adulte',
    );

    const schedule = await request(app.getHttpServer())
      .get(`/animals/${animalId}/vaccination-schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Nest ne serialise pas explicitement `null` : la reponse est vide (corps {} cote client).
    expect(schedule.body).toEqual({});
  });

  it('calcule automatiquement le prochain rappel via recurrenceMonths', async () => {
    const { accessToken, animalId } = await registerWithAnimal(
      app,
      'recurrence',
    );

    const entry = await request(app.getHttpServer())
      .post(`/animals/${animalId}/health-entries`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'vermifuge',
        scheduledDate: '2026-01-01',
        recurrenceMonths: 3,
      })
      .expect(201);

    expect(entry.body.nextReminderDate).not.toBeNull();
    expect(new Date(entry.body.nextReminderDate).getMonth()).toBe(
      new Date('2026-04-01').getMonth(),
    );
  });

  it("preserve next_reminder_date lors d'une mise a jour partielle (non-regression)", async () => {
    const { accessToken, animalId } = await registerWithAnimal(
      app,
      'preserve-reminder',
    );

    const entry = await request(app.getHttpServer())
      .post(`/animals/${animalId}/health-entries`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'vaccin',
        scheduledDate: '2026-01-01',
        recurrenceMonths: 12,
      })
      .expect(201);

    expect(entry.body.nextReminderDate).not.toBeNull();

    const updated = await request(app.getHttpServer())
      .put(`/animals/${animalId}/health-entries/${entry.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'fait' })
      .expect(200);

    expect(updated.body.status).toBe('fait');
    expect(updated.body.nextReminderDate).toBe(entry.body.nextReminderDate);
  });

  it('remonte les echeances dans le calendrier du foyer', async () => {
    const { accessToken, householdId, animalId } = await registerWithAnimal(
      app,
      'calendar',
    );

    await request(app.getHttpServer())
      .post(`/animals/${animalId}/health-entries`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'rdv_veto', scheduledDate: '2026-12-01' })
      .expect(201);

    const calendar = await request(app.getHttpServer())
      .get(`/households/${householdId}/calendar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(calendar.body).toHaveLength(1);
    expect(calendar.body[0].animalName).toBe('Patient');
  });

  it('bloque les comptes-rendus consolides en gratuit, les autorise en premium', async () => {
    const { accessToken, animalId } = await registerWithAnimal(app, 'reports');

    await request(app.getHttpServer())
      .post(`/animals/${animalId}/health-entries`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'rdv_veto',
        scheduledDate: '2026-01-15',
        status: 'fait',
        report: 'RAS, controle de routine.',
      })
      .expect(201);

    const blocked = await request(app.getHttpServer())
      .get(`/animals/${animalId}/reports`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
    expect(blocked.body.errorCode).toBe('PLAN_LIMIT_REPORTS');

    await activatePremium(app, accessToken);

    const reports = await request(app.getHttpServer())
      .get(`/animals/${animalId}/reports`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(reports.body).toHaveLength(1);
    expect(reports.body[0].report).toBe('RAS, controle de routine.');
  });
});
