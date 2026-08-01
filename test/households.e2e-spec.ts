import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, uniqueEmail } from './utils/test-app';
import { activatePremium } from './utils/subscriptions';

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

  it('permet au proprietaire de renommer le foyer, refuse a un simple membre', async () => {
    const owner = await registerWithHousehold(
      app,
      'rename-owner',
      'Nom initial',
    );
    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const householdId = households.body[0].id;
    const inviteCode = households.body[0].inviteCode;

    const member = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail('rename-member'),
        password: 'password123',
        firstName: 'Membre',
        lastName: 'Test',
        inviteCode,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/households/${householdId}`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .send({ name: 'Tentative membre' })
      .expect(403);

    const renamed = await request(app.getHttpServer())
      .patch(`/households/${householdId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Nouveau nom' })
      .expect(200);

    expect(renamed.body.name).toBe('Nouveau nom');
  });

  it("reserve la regeneration du code d'invitation au proprietaire", async () => {
    const owner = await registerWithHousehold(
      app,
      'regen-owner',
      'Foyer regen',
    );
    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const householdId = households.body[0].id;
    const inviteCode = households.body[0].inviteCode;

    const member = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail('regen-member'),
        password: 'password123',
        firstName: 'Membre',
        lastName: 'Test',
        inviteCode,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/households/${householdId}/invite-code/regenerate`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/households/${householdId}/invite-code/regenerate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(201);
  });

  it('permet au proprietaire de retirer un membre, refuse a un simple membre', async () => {
    const owner = await registerWithHousehold(
      app,
      'remove-owner',
      'Foyer remove',
    );
    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const householdId = households.body[0].id;
    const inviteCode = households.body[0].inviteCode;
    const memberEmail = uniqueEmail('remove-member');

    const member = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: memberEmail,
        password: 'password123',
        firstName: 'Membre',
        lastName: 'Test',
        inviteCode,
      })
      .expect(201);

    const membersBefore = await request(app.getHttpServer())
      .get(`/households/${householdId}/members`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const memberUserId = membersBefore.body.find(
      (m: { email: string }) => m.email === memberEmail,
    ).id;

    // Un simple membre ne peut pas retirer quelqu'un
    await request(app.getHttpServer())
      .delete(`/households/${householdId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/households/${householdId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(204);

    const membersAfter = await request(app.getHttpServer())
      .get(`/households/${householdId}/members`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(membersAfter.body).toHaveLength(1);
  });

  it('permet a un membre de quitter le foyer, empeche le proprietaire de le faire', async () => {
    const owner = await registerWithHousehold(
      app,
      'leave-owner',
      'Foyer leave',
    );
    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const householdId = households.body[0].id;
    const inviteCode = households.body[0].inviteCode;

    const member = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail('leave-member'),
        password: 'password123',
        firstName: 'Membre',
        lastName: 'Test',
        inviteCode,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/households/${householdId}/leave`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .post(`/households/${householdId}/leave`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .expect(204);

    const membersAfter = await request(app.getHttpServer())
      .get(`/households/${householdId}/members`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(membersAfter.body).toHaveLength(1);
  });

  it('permet au proprietaire de supprimer le foyer, refuse a un simple membre', async () => {
    const owner = await registerWithHousehold(
      app,
      'delete-owner',
      'Foyer a supprimer',
    );
    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const householdId = households.body[0].id;
    const inviteCode = households.body[0].inviteCode;

    const member = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail('delete-member'),
        password: 'password123',
        firstName: 'Membre',
        lastName: 'Test',
        inviteCode,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/households/${householdId}/animals`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Rex', species: 'Chien' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/households/${householdId}`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/households/${householdId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(204);

    // Le foyer n'apparait plus dans la liste, meme pour l'ancien proprietaire
    const householdsAfter = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(
      householdsAfter.body.find((h: { id: number }) => h.id === householdId),
    ).toBeUndefined();

    // Plus personne (meme l'ex-proprietaire) ne peut plus y acceder
    await request(app.getHttpServer())
      .get(`/households/${householdId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(403);
  });

  it('plan gratuit : limite a 1 foyer, debloque par un abonnement premium', async () => {
    const user = await registerWithHousehold(app, 'plan-household', 'Foyer 1');

    // 2e foyer refuse en gratuit (deja proprietaire/membre d'un foyer)
    await request(app.getHttpServer())
      .post('/households')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Foyer 2' })
      .expect(403);

    await activatePremium(app, user.accessToken);

    // Debloque une fois premium
    await request(app.getHttpServer())
      .post('/households')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Foyer 2' })
      .expect(201);
  });

  it('plan gratuit : limite a 2 animaux par foyer, debloque par un abonnement premium', async () => {
    const owner = await registerWithHousehold(
      app,
      'plan-animals',
      'Foyer animaux',
    );
    const households = await request(app.getHttpServer())
      .get('/households')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const householdId = households.body[0].id;

    await request(app.getHttpServer())
      .post(`/households/${householdId}/animals`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Rex', species: 'Chien' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/households/${householdId}/animals`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Milo', species: 'Chat' })
      .expect(201);

    // 3e animal refuse en gratuit
    await request(app.getHttpServer())
      .post(`/households/${householdId}/animals`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Nera', species: 'Chat' })
      .expect(403);

    await activatePremium(app, owner.accessToken);

    // Debloque une fois premium
    await request(app.getHttpServer())
      .post(`/households/${householdId}/animals`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Nera', species: 'Chat' })
      .expect(201);
  });
});
