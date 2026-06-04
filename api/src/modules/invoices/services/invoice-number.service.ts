import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

/**
 * Sequential, gapless invoice numbering per (org, financial year) — design §8 hard rule.
 *
 * Correctness depends on running INSIDE the same transaction that writes the invoice, and on
 * the row-level lock taken by the atomic UPSERT below. Two concurrent creators serialise on
 * the invoice_counters PK row, so neither can observe the same last_number — no gaps, no dupes.
 * This must NOT be reimplemented as read-then-write in application code.
 */
@Injectable()
export class InvoiceNumberService {
  /**
   * Allocates the next number within the given transaction.
   * @returns formatted number, e.g. "CB/2026-27/0001"
   */
  async allocate(manager: EntityManager, orgId: string, financialYear: string): Promise<string> {
    const rows: Array<{ last_number: number }> = await manager.query(
      `INSERT INTO invoice_counters (org_id, financial_year, last_number)
       VALUES ($1, $2, 1)
       ON CONFLICT (org_id, financial_year)
       DO UPDATE SET last_number = invoice_counters.last_number + 1
       RETURNING last_number`,
      [orgId, financialYear],
    );
    const seq = rows[0].last_number;
    return this.format(financialYear, seq);
  }

  /** Read-only peek at the next number (e.g. for UI preview). Not authoritative. */
  async peekNext(manager: EntityManager, orgId: string, financialYear: string): Promise<string> {
    const rows: Array<{ last_number: number }> = await manager.query(
      `SELECT last_number FROM invoice_counters WHERE org_id = $1 AND financial_year = $2`,
      [orgId, financialYear],
    );
    const next = (rows[0]?.last_number ?? 0) + 1;
    return this.format(financialYear, next);
  }

  format(financialYear: string, seq: number): string {
    return `CB/${financialYear}/${String(seq).padStart(4, '0')}`;
  }
}
