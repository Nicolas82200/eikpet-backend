import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';
import type { AppConfig } from '../config/configuration';

export interface AccessTokenPayload {
  sub: number;
  email: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  signAccessToken(payload: AccessTokenPayload): string {
    const jwtConfig = this.configService.get('jwt', { infer: true });
    return jwt.sign(payload, jwtConfig.accessSecret, {
      expiresIn: jwtConfig.accessExpiresIn,
    } as jwt.SignOptions);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const jwtConfig = this.configService.get('jwt', { infer: true });
    return jwt.verify(
      token,
      jwtConfig.accessSecret,
    ) as unknown as AccessTokenPayload;
  }

  getRefreshExpiresInMs(): number {
    const jwtConfig = this.configService.get('jwt', { infer: true });
    return ms(jwtConfig.refreshExpiresIn);
  }

  generateRefreshToken(): string {
    return randomBytes(48).toString('hex');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

function ms(duration: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Duree invalide: ${duration}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const unitMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * unitMs[unit];
}
