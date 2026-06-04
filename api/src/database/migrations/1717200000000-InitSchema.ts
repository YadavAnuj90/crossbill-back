import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial Phase 1 schema: organizations, users, clients, invoices, invoice_items,
 * refresh_tokens, and the invoice_counters gapless-numbering table.
 */
export class InitSchema1717200000000 implements MigrationInterface {
  name = 'InitSchema1717200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await q.query(`
      CREATE TABLE "organizations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "owner_id" uuid,
        "plan" varchar(32) NOT NULL DEFAULT 'free',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(320) NOT NULL UNIQUE,
        "password_hash" varchar(255),
        "google_id" varchar(255),
        "email_verified" boolean NOT NULL DEFAULT false,
        "legal_name" varchar(255),
        "gstin" varchar(15),
        "address" text,
        "default_sac" varchar(6),
        "bank_account" varchar(64),
        "bank_ifsc" varchar(16),
        "lut_number" varchar(64),
        "lut_fy" varchar(9),
        "lut_arn" varchar(64),
        "role" varchar(16) NOT NULL DEFAULT 'OWNER',
        "org_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX "idx_users_org" ON "users"("org_id")`);

    await q.query(`
      CREATE TABLE "clients" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "email" varchar(320),
        "address" text,
        "country" varchar(2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX "idx_clients_org" ON "clients"("org_id")`);

    await q.query(`
      CREATE TABLE "invoices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "client_id" uuid NOT NULL REFERENCES "clients"("id"),
        "number" varchar(32) NOT NULL,
        "financial_year" varchar(9) NOT NULL,
        "invoice_date" date NOT NULL,
        "currency" varchar(3) NOT NULL,
        "fx_rate" numeric(18,6) NOT NULL,
        "fx_rate_source" varchar(64) NOT NULL,
        "fx_rate_date" date NOT NULL,
        "subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "inr_equivalent" numeric(18,2) NOT NULL DEFAULT 0,
        "declaration_text" text NOT NULL,
        "place_of_supply" varchar(128) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'draft',
        "fema_due_date" date NOT NULL,
        "pdf_url" varchar(512),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_invoice_org_fy_number" UNIQUE ("org_id","financial_year","number")
      )`);
    await q.query(`CREATE INDEX "idx_invoices_org" ON "invoices"("org_id")`);
    await q.query(`CREATE INDEX "idx_invoices_status" ON "invoices"("status")`);

    await q.query(`
      CREATE TABLE "invoice_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
        "description" text NOT NULL,
        "sac_code" varchar(6) NOT NULL,
        "quantity" numeric(12,2) NOT NULL DEFAULT 1,
        "unit_amount" numeric(18,2) NOT NULL,
        "line_total" numeric(18,2) NOT NULL
      )`);
    await q.query(`CREATE INDEX "idx_items_invoice" ON "invoice_items"("invoice_id")`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS "invoice_counters" (
        "org_id" uuid NOT NULL,
        "financial_year" varchar(9) NOT NULL,
        "last_number" integer NOT NULL DEFAULT 0,
        PRIMARY KEY ("org_id","financial_year")
      )`);

    await q.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "family_id" uuid NOT NULL,
        "token_hash" varchar(128) NOT NULL,
        "revoked" boolean NOT NULL DEFAULT false,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX "idx_rt_user" ON "refresh_tokens"("user_id")`);
    await q.query(`CREATE INDEX "idx_rt_family" ON "refresh_tokens"("family_id")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await q.query(`DROP TABLE IF EXISTS "invoice_items"`);
    await q.query(`DROP TABLE IF EXISTS "invoices"`);
    await q.query(`DROP TABLE IF EXISTS "clients"`);
    await q.query(`DROP TABLE IF EXISTS "users"`);
    await q.query(`DROP TABLE IF EXISTS "organizations"`);
    await q.query(`DROP TABLE IF EXISTS "invoice_counters"`);
  }
}
