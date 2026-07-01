import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organization.schema';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name) private readonly orgs: Model<OrganizationDocument>,
    private readonly audit: AuditService,
  ) {}

  /** Creates a personal org for a new user; the user becomes its OWNER. */
  createForOwner(name: string) {
    return this.orgs.create({ name, plan: 'free' });
  }

  findById(id: string) {
    return this.orgs.findById(id).exec();
  }

  async setOwner(orgId: string, ownerId: string) {
    await this.orgs.findByIdAndUpdate(orgId, { ownerId }).exec();
  }

  /** Activate a paid plan after a successful Razorpay payment (billing webhook). */
  async setPlan(orgId: string, plan: string, razorpaySubscriptionId: string | null = null) {
    await this.orgs
      .findByIdAndUpdate(orgId, {
        plan,
        planActivatedAt: new Date().toISOString(),
        ...(razorpaySubscriptionId ? { razorpaySubscriptionId } : {}),
      })
      .exec();
  }

  // ── Company verification & setup (design §2) ──
  private companyView(org: OrganizationDocument | null) {
    if (!org) return null;
    return {
      id: org.id, name: org.name,
      gstin: org.gstin, pan: org.pan, registeredAddress: org.registeredAddress,
      logoUrl: org.logoUrl, website: org.website,
      ownerName: org.ownerName, ownerEmail: org.ownerEmail, ownerMobile: org.ownerMobile,
      verificationStatus: org.verificationStatus, verificationNotes: org.verificationNotes,
      verificationSubmittedAt: org.verificationSubmittedAt, verifiedAt: org.verifiedAt,
      plan: org.plan,
    };
  }

  async getCompany(orgId: string) {
    return this.companyView(await this.orgs.findById(orgId).exec());
  }

  async updateCompany(orgId: string, patch: Record<string, any>, userId?: string) {
    const allowed = ['name', 'gstin', 'pan', 'registeredAddress', 'logoUrl', 'website', 'ownerName', 'ownerEmail', 'ownerMobile'];
    const set: Record<string, any> = {};
    for (const k of allowed) if (patch[k] !== undefined) set[k] = patch[k] || null;
    const org = await this.orgs.findByIdAndUpdate(orgId, set, { new: true }).exec();
    await this.audit.log({
      action: 'company.updated', orgId, userId, resourceId: orgId, meta: { fields: Object.keys(set) },
    });
    return this.companyView(org);
  }

  async submitVerification(orgId: string, userId?: string) {
    const org = await this.orgs.findByIdAndUpdate(
      orgId,
      { verificationStatus: 'pending', verificationSubmittedAt: new Date().toISOString(), verificationNotes: null },
      { new: true },
    ).exec();
    await this.audit.log({ action: 'company.verification_submitted', orgId, userId, resourceId: orgId });
    return this.companyView(org);
  }

  /** Platform/admin action: approve or reject a company's verification. */
  async setVerification(orgId: string, status: 'verified' | 'rejected', notes?: string, userId?: string) {
    const org = await this.orgs.findByIdAndUpdate(
      orgId,
      {
        verificationStatus: status,
        verificationNotes: notes ?? null,
        verifiedAt: status === 'verified' ? new Date().toISOString() : null,
      },
      { new: true },
    ).exec();
    await this.audit.log({
      action: 'company.verification_decided', orgId, userId, resourceId: orgId, meta: { status, notes: notes ?? null },
    });
    return this.companyView(org);
  }

  // ── Signing geofences (fraud prevention) ──
  async getGeofences(orgId: string): Promise<Array<{ label: string; lat: number; lng: number; radiusKm: number }>> {
    const org = await this.orgs.findById(orgId).exec();
    return (org?.signGeofences ?? []).map((g) => ({ label: g.label, lat: g.lat, lng: g.lng, radiusKm: g.radiusKm }));
  }

  async setGeofences(orgId: string, fences: Array<{ label: string; lat: number; lng: number; radiusKm: number }>) {
    await this.orgs.findByIdAndUpdate(orgId, { signGeofences: fences }).exec();
    return this.getGeofences(orgId);
  }
}
