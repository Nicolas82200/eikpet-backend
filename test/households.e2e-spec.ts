import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, uniqueEmail } from './utils/test-app';

async function registerWithHousehold(
  app: INestApplication<App>,
  prefix: string,
  householdName: string,
) {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email: uniqueEmail(prefix),
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      householdName,
    })
    .expect(201);
  return response.body as { accessToken: string; refreshToken: string };
}

describe('Households isolation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("n'expose pas les animaux d'un autre foyer", async () => {
    const userA = await registerWithHousehold(app, 'household-a', 'Foyer A');
    const userB = await registerWithHousehold(app, 'household-b', 'Foyer B');

    const householdsA = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .expect(200);
    const householdIdA = householdsA.body[0].id;

    await request(app.getHttpServer())
      .post(`/households/${householdIdA}/animals`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ name: 'Rex', species: 'Chien' })
      .expect(201);

    // userB ne fait pas partie du foyer A : acces refuse
    await request(app.getHttpServer())
      .get(`/households/${householdIdA}/animals`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .expect(403);
  });

  it("empeche de creer un animal dans un foyer dont on n'est pas membre", async () => {
    const userA = await registerWithHousehold(
      app,
      'create-a',
      'Foyer create A',
    );
    const userB = await registerWithHousehold(
      app,
      'create-b',
      'Foyer create B',
    );

    const householdsA = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .expect(200);
    const householdIdA = householdsA.body[0].id;

    await request(app.getHttpServer())
      .post(`/households/${householdIdA}/animals`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ name: 'Intrus', species: 'Chat' })
      .expect(403);
  });

  it('permet de lister ses propres foyers et leurs membres', async () => {
    const owner = await registerWithHousehold(app, 'list-owner', 'Foyer liste');

    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const householdId = households.body[0].id;

    const members = await request(app.getHttpServer())
      .get(`/households/${householdId}/members`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(members.body).toHaveLength(1);
    expect(members.body[0].role).toBe('owner');
  });
});
