import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Server-side refresh token record (design §9).
 * The token itself is stored HASHED. Rotation invalidates the prior token; reuse of a
 * retired token revokes the entire session family (theft signal).
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** Groups all tokens rotated from a single login. Revoked together on reuse. */
  @Index()
  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ name: 'token_hash' })
  tokenHash: string;

  @Column({ default: false })
  revoked: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
