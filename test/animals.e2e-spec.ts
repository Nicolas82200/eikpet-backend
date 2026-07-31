import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, uniqueEmail } from './utils/test-app';

async function registerAndGetHousehold(
  app: INestApplication<App>,
  prefix: string,
) {
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

  return {
    accessToken: auth.body.accessToken as string,
    householdId: households.body[0].id as number,
  };
}

describe('Animals (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cree un animal et calcule son age automatiquement', async () => {
    const { accessToken, householdId } = await registerAndGetHousehold(
      app,
      'animal-age',
    );

    const response = await request(app.getHttpServer())
      .post(`/households/${householdId}/animals`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Rex', species: 'Chien', birthDate: '2020-01-15' })
      .expect(201);

    expect(response.body.age).toEqual(
      expect.objectContaining({
        years: expect.any(Number),
        months: expect.any(Number),
      }),
    );
    expect(response.body.sterilized).toBe(false);
  });

  it('met a jour un animal et persiste les changements', async () => {
    const { accessToken, householdId } = await registerAndGetHousehold(
      app,
      'animal-update',
    );

    const created = await request(app.getHttpServer())
      .post(`/households/${householdId}/animals`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Milo', species: 'Chat' })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/animals/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sterilized: true, currentWeightKg: 4.2 })
      .expect(200);

    expect(updated.body.sterilized).toBe(true);
    expect(Number(updated.body.currentWeightKg)).toBeCloseTo(4.2);
  });

  it("refuse l'acces a un animal d'un autre foyer", async () => {
    const owner = await registerAndGetHousehold(app, 'animal-owner');
    const stranger = await registerAndGetHousehold(app, 'animal-stranger');

    const created = await request(app.getHttpServer())
      .post(`/households/${owner.householdId}/animals`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Secret', species: 'Cheval' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/animals/${created.body.id}`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/animals/${created.body.id}`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .expect(403);
  });

  it('supprime un animal', async () => {
    const { accessToken, householdId } = await registerAndGetHousehold(
      app,
      'animal-delete',
    );

    const created = await request(app.getHttpServer())
      .post(`/households/${householdId}/animals`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Temporaire', species: 'Chien' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/animals/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/animals/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
