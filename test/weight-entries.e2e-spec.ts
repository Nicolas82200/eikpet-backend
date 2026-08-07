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

  const animal = await request(app.getHttpServer())
    .post(`/households/${householdId}/animals`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Rex', species: 'Chien' })
    .expect(201);

  return { accessToken, householdId, animalId: animal.body.id as number };
}

describe('Weight entries (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cree, liste et supprime des entrees de poids (premium)', async () => {
    const { accessToken, animalId } = await registerWithAnimal(
      app,
      'weight-crud',
    );
    await activatePremium(app, accessToken);

    const created = await request(app.getHttpServer())
      .post(`/animals/${animalId}/weight-entries`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ weightKg: 12.5, recordedDate: '2026-01-01' })
      .expect(201);
    expect(created.body.weightKg).toBe(12.5);

    await request(app.getHttpServer())
      .post(`/animals/${animalId}/weight-entries`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ weightKg: 13, recordedDate: '2026-02-01' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/animals/${animalId}/weight-entries`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body).toHaveLength(2);
    expect(list.body[0].recordedDate).toBe('2026-01-01');

    await request(app.getHttpServer())
      .delete(`/animals/${animalId}/weight-entries/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const listAfter = await request(app.getHttpServer())
      .get(`/animals/${animalId}/weight-entries`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listAfter.body).toHaveLength(1);
  });

  it('bloque la courbe de poids en plan gratuit (PLAN_LIMIT_WEIGHT_CURVE)', async () => {
    const { accessToken, animalId } = await registerWithAnimal(
      app,
      'weight-free',
    );

    const response = await request(app.getHttpServer())
      .post(`/animals/${animalId}/weight-entries`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ weightKg: 10, recordedDate: '2026-01-01' })
      .expect(403);
    expect(response.body.errorCode).toBe('PLAN_LIMIT_WEIGHT_CURVE');
  });
});
