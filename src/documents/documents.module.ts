import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { TokenModule } from '../auth/token.module';
import { HouseholdsModule } from '../households/households.module';
import { AnimalsModule } from '../animals/animals.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsRepositoryModule } from './documents-repository.module';
import type { AppConfig } from '../config/configuration';

@Module({
  imports: [
    TokenModule,
    HouseholdsModule,
    AnimalsModule,
    DocumentsRepositoryModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        storage: diskStorage({
          destination: configService.get('documents', { infer: true })
            .storagePath,
          filename: (_req, file, callback) => {
            callback(null, `${randomUUID()}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: 20 * 1024 * 1024 },
      }),
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
