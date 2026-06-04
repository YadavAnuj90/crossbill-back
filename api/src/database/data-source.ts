import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

/**
 * Standalone TypeORM data source for the CLI (migrations).
 * The app itself configures TypeORM via PostgresModule.
 * NOTE: synchronize is always false — schema changes go through migrations (design §20).
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsRun: false,
};

export default new DataSource(dataSourceOptions);
