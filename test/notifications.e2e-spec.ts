import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, uniqueEmail } from './utils/test-app';

async function register(app: INestApplication<App>, prefix: string) {
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
  return auth.body.accessToken as string;
}

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('enregistre puis desinscrit un token push', async () => {
    const accessToken = await register(app, 'push-token');
    const fcmToken = `fake-fcm-token-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/notifications/push-tokens')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fcmToken, deviceInfo: 'android test-device' })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/notifications/push-tokens')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fcmToken })
      .expect(204);
  });

  it('rejette un enregistrement de token sans authentification', async () => {
    await request(app.getHttpServer())
      .post('/notifications/push-tokens')
      .send({ fcmToken: 'no-auth-token' })
      .expect(401);
  });

  it('accepte de re-enregistrer le meme token (upsert)', async () => {
    const accessToken = await register(app, 'push-token-upsert');
    const fcmToken = `fake-fcm-token-upsert-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/notifications/push-tokens')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fcmToken })
      .expect(201);

    await request(app.getHttpServer())
      .post('/notifications/push-tokens')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fcmToken, deviceInfo: 'mise a jour device info' })
      .expect(201);
  });
});
