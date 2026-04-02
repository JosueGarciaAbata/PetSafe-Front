import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

dotenv.config();

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsGlob = join(currentDir, '../../migrations/*{.ts,.js}');
const entitiesGlob = join(currentDir, '../../domain/entities/**/*.entity{.ts,.js}');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'safepet_user',
  password: process.env.DB_PASSWORD || 'safepet_secret',
  database: process.env.DB_NAME || 'safepet_db',
  migrations: [migrationsGlob],
  entities: [entitiesGlob],
  synchronize: false,
});
