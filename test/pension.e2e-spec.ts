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

describe('Pension (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cree, liste, modifie et supprime une echeance de pension (premium)', async () => {
    const { accessToken, animalId } = await registerWithAnimal(
      app,
      'pension-crud',
    );

    const created = await request(app.getHttpServer())
      .post(`/animals/${animalId}/boardings`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Pension du Val',
        price: 250,
        periodicity: 'mensuel',
        dueDate: '2026-09-01',
      })
      .expect(201);
    expect(created.body.status).toBe('non_regle');

    const list = await request(app.getHttpServer())
      .get(`/animals/${animalId}/boardings`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    const updated = await request(app.getHttpServer())
      .patch(`/animals/${animalId}/boardings/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'regle' })
      .expect(200);
    expect(updated.body.status).toBe('regle');

    await request(app.getHttpServer())
      .delete(`/animals/${animalId}/boardings/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const listAfter = await request(app.getHttpServer())
      .get(`/animals/${animalId}/boardings`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listAfter.body).toHaveLength(0);
  });

  it('bloque la creation en plan gratuit (PLAN_LIMIT_PENSION)', async () => {
    const auth = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail('pension-free'),
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        householdName: 'Foyer pension free',
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
      .send({ name: 'Milo', species: 'Chien' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/animals/${animal.body.id}/boardings`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Pension X', dueDate: '2026-09-01' })
      .expect(403);
    expect(response.body.errorCode).toBe('PLAN_LIMIT_PENSION');
  });
});
