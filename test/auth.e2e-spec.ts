import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, uniqueEmail } from './utils/test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("refuse l'inscription sans foyer a creer ni code d'invitation", async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail('no-household'),
        password: 'password123',
        firstName: 'Jean',
        lastName: 'Dupont',
      })
      .expect(400);
  });

  it('inscrit un utilisateur avec creation de foyer et renvoie des tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail('register'),
        password: 'password123',
        firstName: 'Jean',
        lastName: 'Dupont',
        householdName: 'Foyer e2e',
      })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('refuse une deuxieme inscription avec le meme email', async () => {
    const email = uniqueEmail('duplicate');
    await request(app.getHttpServer())
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
      .post('/auth/register')
      .send({
        email,
        password: 'password123',
        firstName: 'A',
        lastName: 'B',
        householdName: 'Foyer 2',
      })
      .expect(409);
  });

  it('connecte un utilisateur existant et refuse un mauvais mot de passe', async () => {
    const email = uniqueEmail('login');
    await request(app.getHttpServer())
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
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);

    expect(loginResponse.body).toHaveProperty('accessToken');
  });

  it('rejette les routes protegees sans token', async () => {
    await request(app.getHttpServer()).get('/households').expect(401);
  });

  it("permet de rafraichir les tokens et revoque l'ancien refresh token", async () => {
    const email = uniqueEmail('refresh');
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

    const { refreshToken } = register.body;

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshed.body).toHaveProperty('accessToken');
    expect(refreshed.body.refreshToken).not.toBe(refreshToken);

    // L'ancien refresh token doit avoir ete revoque (rotation)
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it("permet de rejoindre un foyer existant via un code d'invitation", async () => {
    const ownerEmail = uniqueEmail('owner');
    const owner = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: ownerEmail,
        password: 'password123',
        firstName: 'Owner',
        lastName: 'Foyer',
        householdName: 'Foyer partage',
      })
      .expect(201);

    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .expect(200);
    const inviteCode = households.body[0].inviteCode;

    const memberEmail = uniqueEmail('member');
    const member = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: memberEmail,
        password: 'password123',
        firstName: 'Membre',
        lastName: 'Foyer',
        inviteCode,
      })
      .expect(201);

    const memberHouseholds = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .expect(200);

    expect(memberHouseholds.body).toHaveLength(1);
    expect(memberHouseholds.body[0].inviteCode).toBe(inviteCode);
    expect(memberHouseholds.body[0].role).toBe('member');
  });

  it("rejette un code d'invitation invalide", async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail('bad-invite'),
        password: 'password123',
        firstName: 'A',
        lastName: 'B',
        inviteCode: 'INVALIDE',
      })
      .expect(400);
  });
});
