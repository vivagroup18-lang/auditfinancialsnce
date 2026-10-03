import { SubscriptionPlan, SubscriptionTier, PromoCode, BillingCycle, CreditPack } from '../types';

export const GST_RATE = 0.18; // 18% GST applicable for Indian B2B SaaS

export const REFERRAL_CREDIT_BONUS = 500; // 500 Credits awarded per successful referral
export const NEW_USER_SIGNUP_CREDITS = 555; // Free welcome credit grant (555 points)

export const CREDIT_COSTS = {
  AI_MAPPING: 5, // 5 credits per AI Schedule & Ledger mapping run
  AUDIT_DIAGNOSTICS: 10, // 10 credits for full ICAI NCE Exception & tax audit scan
  EXCEL_EXPORT: 5, // 5 credits to generate formatted statutory multi-sheet Excel
} as const;

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack_500',
    name: 'Starter Boost',
    credits: 500,
    priceINR: 499,
    tagline: 'Ideal for 1-2 rapid audit assignments',
  },
  {
    id: 'pack_1500',
    name: 'Practitioner Pack',
    credits: 1500,
    priceINR: 1199,
    popular: true,
    tagline: 'Save 20% • Best for busy tax audit season',
  },
  {
    id: 'pack_5000',
    name: 'Power Firm Pack',
    credits: 5000,
    priceINR: 2999,
    tagline: 'Save 40% • High-volume batch processing',
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free_trial',
    name: 'Starter / Trial',
    tagline: 'Essential ICAI NCE statements for individual audits & testing',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyCredits: 555,
    maxCompanies: 9999,
    maxAiMappings: 9999,
    badge: '555 Welcome Credits',
    popular: false,
    features: [
      { text: '555 Free Welcome Credit Points on Signup', included: true, highlight: true },
      { text: 'Earn 500 Free Credits per Colleague Referral', included: true, highlight: true },
      { text: 'Unlimited Companies / Entities with Credits', included: true, highlight: true },
      { text: 'ICAI NCE Notes 3 to 25 Schedules', included: true },
      { text: 'Interactive Trial Balance & Verification', included: true },
      { text: 'Standard Excel & PDF Export', included: true },
      { text: 'Automated Form 3CD/3CB Tax Audit Exceptions', included: true },
      { text: 'Google Drive & Gmail Direct Integration', included: true },
      { text: 'Partner Capital & Year-End Adjustments', included: true },
      { text: 'Firm-Wide Multi-Auditor Team Workspace', included: true },
    ],
    limitations: [
      'Standard 555 welcome credit pool on signup',
      'Pay-as-you-go credit top-ups',
    ],
  },
  {
    id: 'professional',
    name: 'CA Professional',
    tagline: 'Ideal for Practicing Chartered Accountants & Independent Auditors',
    monthlyPrice: 1499,
    yearlyPrice: 14999, // ~₹1,250/month (Save 17%)
    monthlyCredits: 2500,
    maxCompanies: 9999,
    maxAiMappings: 9999,
    popular: true,
    badge: '2,500 Credits',
    features: [
      { text: '2,500 Credits', included: true, highlight: true },
      { text: '500 Bonus Referral Credits on every invite', included: true, highlight: true },
      { text: 'Unlimited Companies / Audit Clients', included: true, highlight: true },
      { text: 'ICAI NCE Notes 3 to 25 Full Disclosures', included: true },
      { text: 'Automated Form 3CD/3CB Tax Audit Exceptions', included: true, highlight: true },
      { text: 'Partner Capital Accounts & Profit Distribution', included: true },
      { text: 'Year-End Closing Stock & Provisions Adjustment', included: true },
      { text: 'Direct Google Drive & Gmail Transmittal Workpapers', included: true },
      { text: 'Detailed Formatted Excel Workbooks with Formulas', included: true },
      { text: 'Priority Email & WhatsApp CA Support', included: true },
    ],
    limitations: [
      'Single Auditor / Practitioner Login',
      'Standard ICAI Taxonomy (No custom notes modification)',
    ],
  },
  {
    id: 'enterprise',
    name: 'Firm / Enterprise',
    tagline: 'Full-spectrum power for Multi-Partner CA Firms & Large Audit Practices',
    monthlyPrice: 3999,
    yearlyPrice: 39999, // ~₹3,333/month (Save 17%)
    monthlyCredits: 10000,
    maxCompanies: 9999, // Unlimited
    maxAiMappings: 9999, // Unlimited
    popular: false,
    badge: '10,000 Credits',
    features: [
      { text: '10,000 Credits', included: true, highlight: true },
      { text: 'Unlimited Companies & Audit Clients', included: true, highlight: true },
      { text: '500 Bonus Referral Credits + Custom Invite Link', included: true, highlight: true },
      { text: 'Multi-Partner & Article Assistant Access (Up to 10 Seats)', included: true, highlight: true },
      { text: 'Custom Firm Letterhead, Watermark & UDIN Formatting', included: true },
      { text: 'Bulk Multi-Year Trial Balance Ingestion Engine', included: true },
      { text: 'Automated Cloud Backup & Historical Rollbacks', included: true },
      { text: 'Full Form 3CD/3CB Schedule Tax Diagnostics', included: true },
      { text: 'Advanced Financial Statement Analysis & Ratios', included: true },
      { text: 'Dedicated Account Manager & Phone SLA', included: true },
    ],
    limitations: [],
  },
];

export const PROMO_CODES: PromoCode[] = [
  {
    code: 'ICAI2025',
    discountPercent: 20,
    description: '20% Special Discount for ICAI Members & CA Students',
  },
  {
    code: 'EARLYBIRD',
    discountPercent: 15,
    description: '15% Early Bird Practitioner Launch Offer',
  },
  {
    code: 'VIPCA',
    discountPercent: 25,
    description: '25% Partner Firm Privilege Discount',
  },
  {
    code: 'FREEMONTH',
    discountPercent: 100,
    description: '100% Free Month Demo Voucher',
  },
];

/**
 * Calculates price breakdown including GST and optional promo code discount.
 */
export function calculatePricingBreakdown(
  plan: SubscriptionPlan,
  billingCycle: BillingCycle,
  promoCode?: string
): {
  basePrice: number;
  discountPercent: number;
  discountAmount: number;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  appliedPromo?: PromoCode;
} {
  const basePrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

  let appliedPromo: PromoCode | undefined;
  let discountPercent = 0;

  if (promoCode) {
    const cleanCode = promoCode.trim().toUpperCase();
    appliedPromo = PROMO_CODES.find((p) => p.code === cleanCode);
    if (appliedPromo) {
      discountPercent = appliedPromo.discountPercent;
    }
  }

  const discountAmount = Math.round((basePrice * discountPercent) / 100);
  const subtotal = Math.max(0, basePrice - discountAmount);
  const gstAmount = Math.round(subtotal * GST_RATE);
  const totalAmount = subtotal + gstAmount;

  return {
    basePrice,
    discountPercent,
    discountAmount,
    subtotal,
    gstAmount,
    totalAmount,
    appliedPromo,
  };
}

/**
 * Calculates next renewal / expiry date given a cycle.
 */
export function calculateNextExpiryDate(billingCycle: BillingCycle, fromDate: Date = new Date()): string {
  const d = new Date(fromDate);
  if (billingCycle === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

/**
 * Formats Indian Currency (₹) with proper locale.
 */
export function formatCurrencyINR(amount: number): string {
  if (amount === 0) return 'Free';
  return '₹' + amount.toLocaleString('en-IN');
}
