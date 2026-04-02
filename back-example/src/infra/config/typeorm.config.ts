import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const entitiesGlob = join(currentDir, '../../domain/entities/**/*.entity{.ts,.js}');

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres' as const,
    host: config.get<string>('DB_HOST', '127.0.0.1'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USERNAME', 'safepet_user'),
    password: config.get<string>('DB_PASSWORD', 'safepet_secret'),
    database: config.get<string>('DB_NAME', 'safepet_db'),
    entities: [entitiesGlob],
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
  }),
};
