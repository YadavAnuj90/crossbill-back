import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AadhaarVerification, AadhaarVerificationDocument } from './schemas/aadhaar-verification.schema';
import { AADHAAR_PROVIDER, AadhaarProvider } from './providers/aadhaar-provider.interface';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AadhaarService {
  constructor(
    @InjectModel(AadhaarVerification.name) private readonly verifications: Model<AadhaarVerificationDocument>,
    @Inject(AADHAAR_PROVIDER) private readonly provider: AadhaarProvider,
    private readonly audit: AuditService,
  ) {}

  status() {
    return { provider: this.provider.name, sandbox: this.provider.sandbox, configured: true };
  }

  /** Start an Aadhaar OTP verification (masked storage only). */
  async initiate(orgId: string, agreementId: string | null, aadhaar: string, ip?: string, ua?: string) {
    const digits = (aadhaar || '').replace(/\s/g, '');
    if (!/^\d{12}$/.test(digits)) throw new BadRequestException('Enter a valid 12-digit Aadhaar number');

    const { referenceId, devOtp } = await this.provider.initiate(digits);
    await this.verifications.create({
      orgId, agreementId, channel: 'aadhaar_otp', provider: this.provider.name,
      referenceId, aadhaarLast4: digits.slice(-4), status: 'otp_sent',
      ip: ip ?? null, userAgent: ua?.slice(0, 400) ?? null,
    });
    await this.audit.log({ action: 'aadhaar.otp_sent', orgId, resourceId: agreementId ?? referenceId, meta: { last4: digits.slice(-4) } });
    // devOtp is ONLY present for the sandbox provider — used to test the flow.
    return { referenceId, otpRequired: true, sandbox: this.provider.sandbox, devOtp };
  }

  /** Verify an OTP; returns { ok, last4 } and records the outcome. */
  async verify(orgId: string, referenceId: string, otp: string) {
    const v = await this.verifications.findOne({ orgId, referenceId }).exec();
    if (!v) throw new BadRequestException('Verification not found or expired');
    if (v.status === 'verified') return { ok: true, last4: v.aadhaarLast4 };

    v.attempts += 1;
    const r = await this.provider.verify(referenceId, (otp || '').trim());
    if (!r.ok) {
      if (v.attempts >= 5) v.status = 'failed';
      await v.save();
      await this.audit.log({ action: 'aadhaar.verify_failed', orgId, resourceId: v.agreementId ?? referenceId });
      throw new BadRequestException('Incorrect or expired OTP');
    }
    v.status = 'verified';
    v.verifiedAt = new Date().toISOString();
    await v.save();
    await this.audit.log({ action: 'aadhaar.verified', orgId, resourceId: v.agreementId ?? referenceId, meta: { last4: v.aadhaarLast4 } });
    return { ok: true, last4: v.aadhaarLast4 ?? r.last4 ?? null };
  }

  list(orgId: string, agreementId?: string) {
    const filter: Record<string, any> = { orgId };
    if (agreementId) filter.agreementId = agreementId;
    return this.verifications.find(filter).sort({ createdAt: -1 }).limit(200).exec().then((r) => r.map((v) => v.toJSON()));
  }
}
