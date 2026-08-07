import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { join } from 'path';
import { createTestApp, uniqueEmail } from './utils/test-app';
import { activatePremium } from './utils/subscriptions';

const SAMPLE_FILE = join(__dirname, 'fixtures', 'sample.txt');

describe('Account deletion (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuse la suppression avec un mauvais mot de passe', async () => {
    const email = uniqueEmail('delete-wrong-pwd');
    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'password123',
        firstName: 'A',
        lastName: 'B',
        householdName: 'Foyer',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/auth/account')
      .set('Authorization', `Bearer ${register.body.accessToken}`)
      .send({ password: 'wrong-password' })
      .expect(401);

    // Le compte existe toujours
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
  });

  it('supprime le compte, revoque les sessions, et supprime les foyers dont il etait proprietaire', async () => {
    const email = uniqueEmail('delete-owner');
    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'password123',
        firstName: 'A',
        lastName: 'B',
        householdName: 'Foyer a supprimer avec moi',
      })
      .expect(201);

    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${register.body.accessToken}`)
      .expect(200);
    const householdId = households.body[0].id;
    await activatePremium(app, register.body.accessToken);

    // Uploader un document pour verifier que la contrainte FK sur uploaded_by_user_id
    // ne bloque pas la suppression (regression test pour la migration 0004)
    await request(app.getHttpServer())
      .post(`/households/${householdId}/documents`)
      .set('Authorization', `Bearer ${register.body.accessToken}`)
      .field('category', 'autre')
      .attach('file', SAMPLE_FILE)
      .expect(201);

    await request(app.getHttpServer())
      .delete('/auth/account')
      .set('Authorization', `Bearer ${register.body.accessToken}`)
      .send({ password: 'password123' })
      .expect(204);

    // Le compte n'existe plus
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(401);

    // La session existante est revoquee
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: register.body.refreshToken })
      .expect(401);

    // On peut re-employer le meme email (plus de conflit)
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'password123',
        firstName: 'A',
        lastName: 'B',
        householdName: 'Nouveau foyer',
      })
      .expect(201);
  });

  it('quitte simplement les foyers dont il etait simple membre (le foyer et les autres membres survivent)', async () => {
    const ownerEmail = uniqueEmail('delete-member-owner');
    const owner = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: ownerEmail,
        password: 'password123',
        firstName: 'Owner',
        lastName: 'B',
        householdName: 'Foyer partage',
      })
      .expect(201);

    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .expect(200);
    const householdId = households.body[0].id;
    const inviteCode = households.body[0].inviteCode;

    const memberEmail = uniqueEmail('delete-member');
    const member = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: memberEmail,
        password: 'password123',
        firstName: 'Membre',
        lastName: 'B',
        inviteCode,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/auth/account')
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .send({ password: 'password123' })
      .expect(204);

    // Le foyer et le proprietaire survivent, le membre supprime n'apparait plus
    const membersAfter = await request(app.getHttpServer())
      .get(`/households/${householdId}/members`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .expect(200);
    expect(membersAfter.body).toHaveLength(1);
    expect(membersAfter.body[0].email).toBe(ownerEmail);
  });
});
