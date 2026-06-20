/** Crossbill subscription plans (billing). Prices in INR major units. */
export interface Plan {
  id: string;
  name: string;
  priceInr: number;        // per month, INR
  tagline: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    priceInr: 0,
    tagline: 'For getting started',
    features: ['Up to 5 invoices / month', 'Export & domestic GST', 'FEMA tracker', 'Credit/debit notes'],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceInr: 999,
    tagline: 'For growing studios',
    features: ['Unlimited invoices', 'Razorpay payment links + auto-reconcile', 'GSTR-1 6A export', 'Compliance bundle', 'Email reminders'],
  },
  {
    id: 'agency',
    name: 'Agency',
    priceInr: 2499,
    tagline: 'For teams & CAs',
    features: ['Everything in Pro', 'Unlimited team members', 'Scoped CA access', 'Priority support', 'e-Invoicing (when live)'],
  },
];

export const PAID_PLAN_IDS = PLANS.filter((p) => p.priceInr > 0).map((p) => p.id);

export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
