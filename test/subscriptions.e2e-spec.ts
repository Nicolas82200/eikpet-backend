import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, uniqueEmail } from './utils/test-app';

const WEBHOOK_SECRET =
  process.env.REVENUECAT_WEBHOOK_SECRET ?? 'test-revenuecat-webhook-secret';

async function registerUser(app: INestApplication<App>, prefix: string) {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email: uniqueEmail(prefix),
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      householdName: `Foyer ${prefix}`,
    })
    .expect(201);
  return response.body as { accessToken: string };
}

function decodeUserId(accessToken: string): number {
  const payload = accessToken.split('.')[1];
  return (
    JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub: number;
    }
  ).sub;
}

describe('Subscriptions (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('renvoie le statut gratuit par defaut', async () => {
    const user = await registerUser(app, 'sub-status-free');

    const status = await request(app.getHttpServer())
      .get('/me/subscription')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(status.body.isPremium).toBe(false);
    expect(status.body.status).toBe('expired');
  });

  it('refuse le webhook RevenueCat sans le bon secret', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/revenuecat')
      .send({
        event: {
          id: 'evt_no_secret',
          type: 'INITIAL_PURCHASE',
          app_user_id: '1',
        },
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/webhooks/revenuecat')
      .set('Authorization', 'Bearer wrong-secret')
      .send({
        event: {
          id: 'evt_wrong_secret',
          type: 'INITIAL_PURCHASE',
          app_user_id: '1',
        },
      })
      .expect(401);
  });

  it('active le plan premium apres un webhook INITIAL_PURCHASE valide', async () => {
    const user = await registerUser(app, 'sub-webhook');
    const userId = decodeUserId(user.accessToken);

    await request(app.getHttpServer())
      .post('/webhooks/revenuecat')
      .set('Authorization', `Bearer ${WEBHOOK_SECRET}`)
      .send({
        event: {
          id: `evt_purchase_${userId}`,
          type: 'INITIAL_PURCHASE',
          app_user_id: String(userId),
          product_id: 'eikpet_premium_monthly',
          expiration_at_ms: Date.now() + 30 * 86_400_000,
        },
      })
      .expect(201);

    const status = await request(app.getHttpServer())
      .get('/me/subscription')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(status.body.isPremium).toBe(true);
    expect(status.body.productId).toBe('eikpet_premium_monthly');
  });
});
