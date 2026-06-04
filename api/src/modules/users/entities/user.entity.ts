import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../../common/constants/roles.enum';

/**
 * User + business profile (design §8).
 * Holds GSTIN, LUT (number/FY/ARN), default SAC, and bank details used to auto-fill invoices.
 * Sensitive fields (bank, tokens) are encrypted at rest in production (design §17).
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string | null;

  @Column({ name: 'google_id', nullable: true })
  googleId: string | null;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  // ── Business profile ──
  @Column({ name: 'legal_name', nullable: true })
  legalName: string | null;

  @Column({ nullable: true })
  gstin: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'default_sac', nullable: true })
  defaultSac: string | null;

  @Column({ name: 'bank_account', nullable: true })
  bankAccount: string | null;

  @Column({ name: 'bank_ifsc', nullable: true })
  bankIfsc: string | null;

  @Column({ name: 'lut_number', nullable: true })
  lutNumber: string | null;

  @Column({ name: 'lut_fy', nullable: true })
  lutFy: string | null;

  @Column({ name: 'lut_arn', nullable: true })
  lutArn: string | null;

  // ── Tenancy ──
  @Column({ type: 'varchar', default: Role.OWNER })
  role: Role;

  @Index()
  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
