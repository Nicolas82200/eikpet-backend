import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, uniqueEmail } from './utils/test-app';
import { activatePremium } from './utils/subscriptions';

describe('Budget (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('calcule le total par animal et par foyer a partir du carnet de sante et de la pension', async () => {
    const auth = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail('budget'),
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        householdName: 'Foyer budget',
      })
      .expect(201);
    const accessToken = auth.body.accessToken as string;

    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const householdId = households.body[0].id;

    await activatePremium(app, accessToken);

    const animal = await request(app.getHttpServer())
      .post(`/households/${householdId}/animals`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Rex', species: 'Chien' })
      .expect(201);
    const animalId = animal.body.id;

    await request(app.getHttpServer())
      .post(`/animals/${animalId}/health-entries`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'vaccin',
        scheduledDate: '2026-01-10',
        status: 'fait',
        price: 45,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/animals/${animalId}/boardings`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Pension du Val', price: 100, dueDate: '2026-02-01' })
      .expect(201);

    const animalBudget = await request(app.getHttpServer())
      .get(`/animals/${animalId}/budget`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(animalBudget.body.healthTotal).toBe(45);
    expect(animalBudget.body.boardingTotal).toBe(100);
    expect(animalBudget.body.total).toBe(145);
    expect(animalBudget.body.byCategory).toEqual([
      { type: 'vaccin', total: 45 },
    ]);

    const householdBudget = await request(app.getHttpServer())
      .get(`/households/${householdId}/budget`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(householdBudget.body.total).toBe(145);
    expect(householdBudget.body.byAnimal).toEqual([
      { animalId, animalName: 'Rex', total: 145 },
    ]);
  });

  it('bloque le budget en plan gratuit (PLAN_LIMIT_BUDGET)', async () => {
    const auth = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail('budget-free'),
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        householdName: 'Foyer budget free',
      })
      .expect(201);
    const accessToken = auth.body.accessToken as string;

    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const householdId = households.body[0].id;

    const response = await request(app.getHttpServer())
      .get(`/households/${householdId}/budget`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
    expect(response.body.errorCode).toBe('PLAN_LIMIT_BUDGET');
  });
});
