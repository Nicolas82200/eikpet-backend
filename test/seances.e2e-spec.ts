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
  const accessToken = auth.body.accessToken as string;

  const households = await request(app.getHttpServer())
    .get('/households')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);
  const householdId = households.body[0].id as number;

  await activatePremium(app, accessToken);

  const animal = await request(app.getHttpServer())
    .post(`/households/${householdId}/animals`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Pilou', species: 'Cheval' })
    .expect(201);

  return { accessToken, householdId, animalId: animal.body.id as number };
}

describe('Seances chevaux (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cree, liste, modifie et supprime une seance (premium)', async () => {
    const { accessToken, animalId } = await registerWithAnimal(
      app,
      'seance-crud',
    );

    const created = await request(app.getHttpServer())
      .post(`/animals/${animalId}/riding-sessions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'dressage', scheduledDate: '2026-09-01', price: 60 })
      .expect(201);
    expect(created.body.status).toBe('prevu');

    const list = await request(app.getHttpServer())
      .get(`/animals/${animalId}/riding-sessions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    const updated = await request(app.getHttpServer())
      .patch(`/animals/${animalId}/riding-sessions/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'fait', report: 'Bonne seance, cheval calme.' })
      .expect(200);
    expect(updated.body.status).toBe('fait');
    expect(updated.body.report).toBe('Bonne seance, cheval calme.');

    await request(app.getHttpServer())
      .delete(`/animals/${animalId}/riding-sessions/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const listAfter = await request(app.getHttpServer())
      .get(`/animals/${animalId}/riding-sessions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listAfter.body).toHaveLength(0);
  });

  it('bloque la creation en plan gratuit (PLAN_LIMIT_RIDING_SESSIONS)', async () => {
    const auth = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail('seance-free'),
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        householdName: 'Foyer seance free',
      })
      .expect(201);
    const accessToken = auth.body.accessToken as string;

    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const householdId = households.body[0].id;

    const animal = await request(app.getHttpServer())
      .post(`/households/${householdId}/animals`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Milo', species: 'Cheval' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/animals/${animal.body.id}/riding-sessions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'entrainement', scheduledDate: '2026-09-01' })
      .expect(403);
    expect(response.body.errorCode).toBe('PLAN_LIMIT_RIDING_SESSIONS');
  });

  it('inclut les seances dans le budget de l animal', async () => {
    const { accessToken, animalId } = await registerWithAnimal(
      app,
      'seance-budget',
    );

    await request(app.getHttpServer())
      .post(`/animals/${animalId}/riding-sessions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'dressage', scheduledDate: '2026-09-01', price: 60 })
      .expect(201);

    const budget = await request(app.getHttpServer())
      .get(`/animals/${animalId}/budget`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(budget.body.ridingSessionsTotal).toBe(60);
    expect(budget.body.total).toBe(60);
  });
});
