import {
  Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { InvoiceItem } from './invoice-item.entity';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

/**
 * Export invoice (design §8). Compliance fields (declaration, place of supply, FX, INR
 * equivalent) are filled by the compliance engine. `number` is sequential + gapless per
 * (org, financial_year) — enforced at the DB level (design §8 hard rule). Money lives here,
 * never in Mongo. Monetary columns use numeric to avoid float drift.
 */
@Entity('invoices')
@Index(['orgId', 'financialYear', 'number'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column()
  number: string;

  @Column({ name: 'financial_year', length: 9 })
  financialYear: string;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate: string;

  @Column({ length: 3 })
  currency: string;

  @Column({ name: 'fx_rate', type: 'numeric', precision: 18, scale: 6 })
  fxRate: string;

  @Column({ name: 'fx_rate_source' })
  fxRateSource: string;

  @Column({ name: 'fx_rate_date', type: 'date' })
  fxRateDate: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  subtotal: string;

  @Column({ name: 'inr_equivalent', type: 'numeric', precision: 18, scale: 2, default: 0 })
  inrEquivalent: string;

  @Column({ name: 'declaration_text', type: 'text' })
  declarationText: string;

  @Column({ name: 'place_of_supply' })
  placeOfSupply: string;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: InvoiceStatus;

  @Column({ name: 'fema_due_date', type: 'date' })
  femaDueDate: string;

  @Column({ name: 'pdf_url', nullable: true })
  pdfUrl: string | null;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true, eager: true })
  items: InvoiceItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
