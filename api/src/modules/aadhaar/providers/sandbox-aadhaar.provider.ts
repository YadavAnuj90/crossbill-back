import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';
import { AadhaarProvider } from './aadhaar-provider.interface';

interface Pending { otp: string; last4: string; expiresAt: number; }

/**
 * Sandbox Aadhaar provider — no external dependency. Generates an OTP in-memory,
 * logs it (dev) and also returns it as `devOtp` so the flow is testable end-to-end.
 * Swap for a licensed ASA/KUA provider in production via config.
 */
@Injectable()
export class SandboxAadhaarProvider implements AadhaarProvider {
  readonly name = 'sandbox';
  readonly sandbox = true;
  private readonly logger = new Logger('AadhaarSandbox');
  private readonly pending = new Map<string, Pending>();

  async initiate(aadhaar: string): Promise<{ referenceId: string; devOtp?: string }> {
    const referenceId = `sbx_${randomBytes(8).toString('hex')}`;
    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    this.pending.set(referenceId, { otp, last4: aadhaar.slice(-4), expiresAt: Date.now() + 10 * 60_000 });
    this.logger.warn(`[sandbox] OTP for ${referenceId}: ${otp}`);
    return { referenceId, devOtp: otp };
  }

  async verify(referenceId: string, otp: string): Promise<{ ok: boolean; last4?: string }> {
    const p = this.pending.get(referenceId);
    if (!p) return { ok: false };
    if (Date.now() > p.expiresAt) { this.pending.delete(referenceId); return { ok: false }; }
    if (p.otp !== otp) return { ok: false };
    this.pending.delete(referenceId);
    return { ok: true, last4: p.last4 };
  }
}
