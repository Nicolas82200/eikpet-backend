import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { join } from 'path';
import { createTestApp, uniqueEmail } from './utils/test-app';
import { activatePremium } from './utils/subscriptions';

const SAMPLE_FILE = join(__dirname, 'fixtures', 'sample.txt');

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

describe('Documents (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('uploade un document et le retrouve dans la liste du foyer', async () => {
    const { accessToken, householdId } = await registerWithHousehold(
      app,
      'doc-upload',
    );
    await activatePremium(app, accessToken);

    const uploaded = await request(app.getHttpServer())
      .post(`/households/${householdId}/documents`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('category', 'ordonnance')
      .attach('file', SAMPLE_FILE)
      .expect(201);

    expect(uploaded.body.category).toBe('ordonnance');
    expect(uploaded.body.fileName).toBe('sample.txt');

    const list = await request(app.getHttpServer())
      .get(`/households/${householdId}/documents`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(uploaded.body.id);
  });

  it('associe un document a un animal et le retrouve via la liste par animal', async () => {
    const { accessToken, householdId } = await registerWithHousehold(
      app,
      'doc-animal',
    );
    await activatePremium(app, accessToken);

    const animal = await request(app.getHttpServer())
      .post(`/households/${householdId}/animals`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Rex', species: 'Chien' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/households/${householdId}/documents`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('category', 'analyse')
      .field('animalId', String(animal.body.id))
      .attach('file', SAMPLE_FILE)
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/animals/${animal.body.id}/documents`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0].category).toBe('analyse');
  });

  it("refuse d'uploader un document dans un foyer dont on n'est pas membre", async () => {
    const owner = await registerWithHousehold(app, 'doc-owner');
    const stranger = await registerWithHousehold(app, 'doc-stranger');

    await request(app.getHttpServer())
      .post(`/households/${owner.householdId}/documents`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .field('category', 'autre')
      .attach('file', SAMPLE_FILE)
      .expect(403);
  });

  it("n'expose pas les documents d'un autre foyer", async () => {
    const owner = await registerWithHousehold(app, 'doc-visibility-owner');
    const stranger = await registerWithHousehold(
      app,
      'doc-visibility-stranger',
    );
    await activatePremium(app, owner.accessToken);

    await request(app.getHttpServer())
      .post(`/households/${owner.householdId}/documents`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .field('category', 'autre')
      .attach('file', SAMPLE_FILE)
      .expect(201);

    await request(app.getHttpServer())
      .get(`/households/${owner.householdId}/documents`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .expect(403);
  });

  it("telecharge le fichier uploade et refuse un membre d'un autre foyer", async () => {
    const owner = await registerWithHousehold(app, 'doc-download-owner');
    const stranger = await registerWithHousehold(app, 'doc-download-stranger');
    await activatePremium(app, owner.accessToken);

    const uploaded = await request(app.getHttpServer())
      .post(`/households/${owner.householdId}/documents`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .field('category', 'autre')
      .attach('file', SAMPLE_FILE)
      .expect(201);

    const downloaded = await request(app.getHttpServer())
      .get(`/documents/${uploaded.body.id}/file`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(downloaded.text).toContain('document de test');

    await request(app.getHttpServer())
      .get(`/documents/${uploaded.body.id}/file`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .expect(403);
  });

  it('supprime un document', async () => {
    const { accessToken, householdId } = await registerWithHousehold(
      app,
      'doc-delete',
    );
    await activatePremium(app, accessToken);

    const uploaded = await request(app.getHttpServer())
      .post(`/households/${householdId}/documents`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('category', 'autre')
      .attach('file', SAMPLE_FILE)
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/documents/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const list = await request(app.getHttpServer())
      .get(`/households/${householdId}/documents`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body).toHaveLength(0);
  });
});
