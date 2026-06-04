import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Invoice } from './invoice.entity';

/** Line item with its own SAC code (default per profile, overridable) (design §8, §12). */
@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  invoice: Invoice;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'sac_code', length: 6 })
  sacCode: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 1 })
  quantity: string;

  @Column({ name: 'unit_amount', type: 'numeric', precision: 18, scale: 2 })
  unitAmount: string;

  @Column({ name: 'line_total', type: 'numeric', precision: 18, scale: 2 })
  lineTotal: string;
}
