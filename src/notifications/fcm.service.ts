import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { AppConfig } from '../config/configuration';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private app: App | null = null;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  onModuleInit(): void {
    const fcmConfig = this.configService.get('fcm', { infer: true });
    if (
      !fcmConfig.projectId ||
      !fcmConfig.clientEmail ||
      !fcmConfig.privateKey
    ) {
      this.logger.warn(
        'Configuration FCM absente : les notifications push sont desactivees',
      );
      return;
    }
    this.app = initializeApp({
      credential: cert({
        projectId: fcmConfig.projectId,
        clientEmail: fcmConfig.clientEmail,
        privateKey: fcmConfig.privateKey,
      }),
    });
  }

  async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
  ): Promise<void> {
    if (!this.app || tokens.length === 0) {
      return;
    }
    await getMessaging(this.app).sendEachForMulticast({
      tokens,
      notification: { title, body },
    });
  }
}
