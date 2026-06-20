import { Injectable } from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { PLANS, planById } from '../payments/plans';

@Injectable()
export class BillingService {
  constructor(
    private readonly payments: PaymentsService,
    private readonly orgs: OrganizationsService,
    private readonly users: UsersService,
  ) {}

  async overview(orgId: string) {
    const org = await this.orgs.findById(orgId);
    const currentPlanId = org?.plan ?? 'free';
    return {
      configured: this.payments.configured(),
      currentPlan: planById(currentPlanId) ?? planById('free'),
      planActivatedAt: org?.planActivatedAt ?? null,
      plans: PLANS,
    };
  }

  async checkout(orgId: string, userId: string, planId: string) {
    const profile = await this.users.findById(userId).catch(() => null);
    return this.payments.createSubscriptionLink(orgId, userId, planId, profile?.email);
  }
}
