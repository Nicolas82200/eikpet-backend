import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, uniqueEmail } from './utils/test-app';
import { EmailService } from '../src/email/email.service';

describe('Password reset & change (e2e)', () => {
  let app: INestApplication<App>;
  let emailService: EmailService;

  beforeAll(async () => {
    app = await createTestApp();
    emailService = app.get(EmailService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('reinitialise le mot de passe via le code recu par email', async () => {
    const email = uniqueEmail('reset-flow');
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

    let capturedCode = '';
    const spy = jest
      .spyOn(emailService, 'sendPasswordResetCode')
      .mockImplementation((_to, code) => {
        capturedCode = code;
        return Promise.resolve();
      });

    await request(app.getHttpServer())
      .post('/auth/password/forgot')
      .send({ email })
      .expect(204);
    expect(capturedCode).toMatch(/^\d{6}$/);

    // Mauvais code refuse
    await request(app.getHttpServer())
      .post('/auth/password/reset')
      .send({ email, code: '000000', newPassword: 'newpassword456' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/password/reset')
      .send({ email, code: capturedCode, newPassword: 'newpassword456' })
      .expect(204);

    // L'ancien mot de passe ne fonctionne plus, le nouveau oui
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'newpassword456' })
      .expect(200);

    // Le code ne peut pas etre reutilise
    await request(app.getHttpServer())
      .post('/auth/password/reset')
      .send({ email, code: capturedCode, newPassword: 'encoreunautre789' })
      .expect(400);

    spy.mockRestore();
  });

  it('renvoie toujours un succes pour un email inconnu (anti-enumeration)', async () => {
    await request(app.getHttpServer())
      .post('/auth/password/forgot')
      .send({ email: uniqueEmail('inconnu') })
      .expect(204);
  });

  it('permet de changer son mot de passe une fois connecte', async () => {
    const email = uniqueEmail('change-flow');
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
      .patch('/auth/password')
      .set('Authorization', `Bearer ${register.body.accessToken}`)
      .send({ currentPassword: 'wrong', newPassword: 'newpassword456' })
      .expect(401);

    await request(app.getHttpServer())
      .patch('/auth/password')
      .set('Authorization', `Bearer ${register.body.accessToken}`)
      .send({ currentPassword: 'password123', newPassword: 'newpassword456' })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'newpassword456' })
      .expect(200);

    // Le changement de mot de passe revoque les refresh tokens existants
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: register.body.refreshToken })
      .expect(401);
  });
});
