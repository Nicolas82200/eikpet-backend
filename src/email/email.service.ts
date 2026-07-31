import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    const brevoConfig = this.configService.get('brevo', { infer: true });
    if (!brevoConfig.apiKey) {
      this.logger.warn(
        `Configuration Brevo absente : email non envoye a ${to} (${subject})`,
      );
      return;
    }

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': brevoConfig.apiKey,
      },
      body: JSON.stringify({
        sender: {
          email: brevoConfig.senderEmail,
          name: brevoConfig.senderName,
        },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      // Ne pas propager l'erreur : le code de reinitialisation est deja stocke cote serveur,
      // et le endpoint appelant renvoie toujours une reponse generique (anti-enumeration d'emails).
      this.logger.error(
        `Echec envoi email a ${to} : HTTP ${response.status} ${body}`,
      );
    }
  }

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    await this.sendEmail(
      to,
      'Reinitialisation de votre mot de passe EikPet',
      `<p>Voici votre code de reinitialisation, valable 15 minutes :</p>
       <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
       <p>Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>`,
    );
  }
}
