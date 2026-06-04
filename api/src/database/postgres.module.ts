// Postgres support has been removed — Crossbill now runs on MongoDB only.
// This stub remains so any stale import resolves; it registers nothing.
import { Module } from '@nestjs/common';

@Module({})
export class PostgresModule {}
