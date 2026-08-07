import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { TokenModule } from '../auth/token.module';
import { HouseholdsModule } from '../households/households.module';
import { AnimalsController } from './animals.controller';
import { AnimalsService } from './animals.service';
import { AnimalsRepositoryModule } from './animals-repository.module';
import { DocumentsRepositoryModule } from '../documents/documents-repository.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import type { AppConfig } from '../config/configuration';

@Module({
  imports: [
    TokenModule,
    HouseholdsModule,
    AnimalsRepositoryModule,
    DocumentsRepositoryModule,
    SubscriptionsModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        storage: diskStorage({
          destination: configService.get('photos', { infer: true }).storagePath,
          filename: (_req, file, callback) => {
            callback(null, `${randomUUID()}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
      }),
    }),
  ],
  controllers: [AnimalsController],
  providers: [AnimalsService],
  exports: [AnimalsService, AnimalsRepositoryModule],
})
export class AnimalsModule {}
