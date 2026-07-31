import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, type Pool } from 'mysql2/promise';
import { DATABASE_POOL } from './database.constants';
import type { AppConfig } from '../config/configuration';

class DatabasePoolHolder implements OnModuleDestroy {
  constructor(public readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DatabasePoolHolder,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const dbConfig = configService.get('database', { infer: true });
        const pool = createPool({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.database,
          waitForConnections: true,
          connectionLimit: 10,
          namedPlaceholders: false,
        });
        return new DatabasePoolHolder(pool);
      },
    },
    {
      provide: DATABASE_POOL,
      inject: [DatabasePoolHolder],
      useFactory: (holder: DatabasePoolHolder) => holder.pool,
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule {}
