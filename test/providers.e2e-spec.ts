import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, uniqueEmail } from './utils/test-app';
import { activatePremium } from './utils/subscriptions';

async function registerWithHousehold(
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

describe('Providers (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cree, liste, modifie et supprime un intervenant', async () => {
    const { accessToken, householdId } = await registerWithHousehold(
      app,
      'provider-crud',
    );

    const created = await request(app.getHttpServer())
      .post(`/households/${householdId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'veto', name: 'Dr Martin', phone: '0102030405' })
      .expect(201);
    expect(created.body.name).toBe('Dr Martin');
    expect(created.body.type).toBe('veto');

    const list = await request(app.getHttpServer())
      .get(`/households/${householdId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body).toHaveLength(1);

    const updated = await request(app.getHttpServer())
      .patch(`/providers/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phone: '0607080910' })
      .expect(200);
    expect(updated.body.phone).toBe('0607080910');

    await request(app.getHttpServer())
      .delete(`/providers/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const listAfter = await request(app.getHttpServer())
      .get(`/households/${householdId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listAfter.body).toHaveLength(0);
  });

  it("n'expose pas les intervenants d'un autre foyer", async () => {
    const owner = await registerWithHousehold(app, 'provider-owner');
    const stranger = await registerWithHousehold(app, 'provider-stranger');

    const created = await request(app.getHttpServer())
      .post(`/households/${owner.householdId}/providers`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ type: 'osteo', name: 'Osteo Foyer A' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/households/${owner.householdId}/providers`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/providers/${created.body.id}`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .send({ name: 'Tentative intrus' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/providers/${created.body.id}`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .expect(403);
  });

  it('rejette un type invalide', async () => {
    const { accessToken, householdId } = await registerWithHousehold(
      app,
      'provider-invalid',
    );

    await request(app.getHttpServer())
      .post(`/households/${householdId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'inconnu-type', name: 'X' })
      .expect(400);
  });

  it("bloque la carte des intervenants en gratuit, l'autorise en premium", async () => {
    const { accessToken, householdId } = await registerWithHousehold(
      app,
      'provider-map',
    );

    await request(app.getHttpServer())
      .post(`/households/${householdId}/providers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'veto',
        name: 'Dr Martin',
        address: '1 rue de la Paix, Paris',
      })
      .expect(201);

    const blocked = await request(app.getHttpServer())
      .get(`/households/${householdId}/providers/map`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
    expect(blocked.body.errorCode).toBe('PLAN_LIMIT_PROVIDER_MAP');

    await activatePremium(app, accessToken);

    // Sans cle Google Maps configuree (cas des tests), le geocodage se desactive
    // silencieusement : l'intervenant n'a pas de coordonnees, donc la carte est vide
    // mais l'appel reussit (pas d'erreur bloquante).
    const map = await request(app.getHttpServer())
      .get(`/households/${householdId}/providers/map`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(map.body).toEqual([]);
  });
});
