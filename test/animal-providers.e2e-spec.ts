import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, uniqueEmail } from './utils/test-app';

async function registerWithTwoAnimals(
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
  const accessToken = auth.body.accessToken as string;

  const households = await request(app.getHttpServer())
    .get('/households')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);
  const householdId = households.body[0].id as number;

  const animalA = await request(app.getHttpServer())
    .post(`/households/${householdId}/animals`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Rex', species: 'Chien' })
    .expect(201);
  const animalB = await request(app.getHttpServer())
    .post(`/households/${householdId}/animals`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Milo', species: 'Chat' })
    .expect(201);

  return {
    accessToken,
    householdId,
    animalAId: animalA.body.id as number,
    animalBId: animalB.body.id as number,
  };
}

describe('Animal providers (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('associe un intervenant existant a plusieurs animaux du meme foyer', async () => {
    const { accessToken, householdId, animalAId, animalBId } =
      await registerWithTwoAnimals(app, 'animal-provider');

    const provider = await request(app.getHttpServer())
      .post(`/households/${householdId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'veto', name: 'Dr Martin' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/animals/${animalAId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ providerId: provider.body.id })
      .expect(201);

    // le meme intervenant est aussi associable a un second animal du foyer
    await request(app.getHttpServer())
      .post(`/animals/${animalBId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ providerId: provider.body.id })
      .expect(201);

    const listA = await request(app.getHttpServer())
      .get(`/animals/${animalAId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listA.body).toHaveLength(1);
    expect(listA.body[0].name).toBe('Dr Martin');

    const listB = await request(app.getHttpServer())
      .get(`/animals/${animalBId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listB.body).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/animals/${animalAId}/providers/${provider.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const listAfter = await request(app.getHttpServer())
      .get(`/animals/${animalAId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listAfter.body).toHaveLength(0);

    // le retrait sur un animal n'affecte pas l'association sur l'autre
    const listBAfter = await request(app.getHttpServer())
      .get(`/animals/${animalBId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listBAfter.body).toHaveLength(1);
  });

  it("refuse d'associer un intervenant d'un autre foyer", async () => {
    const owner = await registerWithTwoAnimals(app, 'animal-provider-owner');
    const stranger = await registerWithTwoAnimals(
      app,
      'animal-provider-stranger',
    );

    const strangerProvider = await request(app.getHttpServer())
      .post(`/households/${stranger.householdId}/providers`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .send({ type: 'osteo', name: 'Osteo etranger' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/animals/${owner.animalAId}/providers`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ providerId: strangerProvider.body.id })
      .expect(400);
  });
});
