import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, uniqueEmail } from './utils/test-app';

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
});
