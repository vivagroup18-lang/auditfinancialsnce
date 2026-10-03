import React, { useState } from 'react';
import {
  X,
  Check,
  Zap,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Gift,
  PlusCircle,
  Coins,
  ShieldCheck,
  Receipt,
  CreditCard,
  Printer,
  Building2,
  Sparkles,
  Star,
  TrendingUp,
  Crown,
} from 'lucide-react';
import {
  SubscriptionTier,
  BillingCycle,
  UserProfile,
  CreditPack,
  SubscriptionPlan,
  UserInvoice,
} from '../types';
import {
  CREDIT_PACKS,
  SUBSCRIPTION_PLANS,
  GST_RATE,
} from '../data/subscriptionPlans';
import { addCredits } from '../utils/storageManager';
import {
  RazorpayCheckoutModal,
  RazorpayCheckoutItem,
} from './RazorpayCheckoutModal';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSubscriptionUpdated: (updatedUser: UserProfile) => void;
  onOpenReferralModal?: () => void;
  initialSelectedTier?: SubscriptionTier;
  initialViewTab?: 'plans' | 'credits';
  upgradeReason?: string;
}

const PLAN_ICONS: Record<string, React.FC<{ className?: string }>> = {
  free_trial: ({ className }) => <Zap className={className} />,
  professional: ({ className }) => <Star className={className} />,
  enterprise: ({ className }) => <Crown className={className} />,
};

const PLAN_GRADIENTS: Record<string, string> = {
  free_trial: 'from-slate-600 to-slate-800',
  professional: 'from-sky-600 to-blue-800',
  enterprise: 'from-violet-600 to-purple-800',
};

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSubscriptionUpdated,
  onOpenReferralModal,
  initialViewTab = 'credits',
  upgradeReason,
}) => {
  const [activeTab, setActiveTab] = useState<'credits' | 'plans' | 'invoices'>(
    initialViewTab === 'plans' ? 'plans' : 'credits'
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [customCreditsInput, setCustomCreditsInput] = useState<string>('2500');
  const [checkoutItem, setCheckoutItem] = useState<RazorpayCheckoutItem | null>(null);
  const [topUpSuccessMsg, setTopUpSuccessMsg] = useState<string | null>(null);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<UserInvoice | null>(null);

  if (!isOpen) return null;

  const availableCredits = currentUser?.credits ?? 555;
  const userInvoices = currentUser?.invoices || [];

  const handleOpenCreditPackCheckout = (pack: CreditPack) => {
    setCheckoutItem({
      itemType: 'credit_pack',
      itemId: pack.id,
      itemName: `${pack.name} (${pack.credits.toLocaleString()} Credits)`,
      tagline: pack.tagline,
      basePriceINR: pack.priceINR,
      creditsGranted: pack.credits,
    });
  };

  const handleOpenCustomCreditCheckout = () => {
    const cleanCredits = Math.max(100, Math.min(50000, Math.round(Number(customCreditsInput) || 1000)));
    const priceINR = Math.max(99, Math.round(cleanCredits * 0.75));
    setCheckoutItem({
      itemType: 'credit_pack',
      itemId: `custom_${cleanCredits}`,
      itemName: `Custom Credit Top-Up (${cleanCredits.toLocaleString()} Credits)`,
      tagline: 'On-demand pay-as-you-go statutory audit credits',
      basePriceINR: priceINR,
      creditsGranted: cleanCredits,
    });
  };

  const handleOpenPlanCheckout = (plan: SubscriptionPlan) => {
    if (plan.id === 'free_trial') return;
    const basePrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const creditsGranted =
      billingCycle === 'yearly' ? plan.monthlyCredits * 12 : plan.monthlyCredits;

    setCheckoutItem({
      itemType: 'subscription',
      itemId: `plan_${plan.id}_${billingCycle}`,
      itemName: `${plan.name} Plan (${billingCycle === 'yearly' ? 'Annual' : 'Monthly'})`,
      tagline: plan.tagline,
      basePriceINR: basePrice,
      creditsGranted,
      planTier: plan.id,
      billingCycle,
    });
  };

  const handleRazorpayPaymentSuccess = ({
    invoice,
    creditsGranted,
    item,
  }: {
    invoice: UserInvoice;
    creditsGranted: number;
    item: RazorpayCheckoutItem;
  }) => {
    if (!currentUser) return;

    const txType = item.itemType === 'subscription' ? 'SUBSCRIPTION_GRANT' : 'TOPUP';
    const planUpdate =
      item.itemType === 'subscription' && item.planTier
        ? { planTier: item.planTier, billingCycle: item.billingCycle || 'monthly' }
        : undefined;

    const res = addCredits(
      currentUser.id,
      creditsGranted,
      `Razorpay (${invoice.transactionId}) — ${item.itemName} (+${creditsGranted.toLocaleString()} Credits)`,
      txType,
      invoice,
      planUpdate
    );

    if (res.success && res.user) {
      onSubscriptionUpdated(res.user);
      setTopUpSuccessMsg(
        `+${creditsGranted.toLocaleString()} credits added! Invoice ${invoice.invoiceNumber} generated.`
      );
      setCheckoutItem(null);
    }
  };

  const PRESET_CREDITS = [500, 1000, 2500, 5000];
  const customPriceINR = Math.max(99, Math.round(Math.max(100, Number(customCreditsInput) || 1000) * 0.75));

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">

          {/* ── Modal Header ── */}
          <div className="bg-gradient-to-r from-[#072654] to-[#1a4ba0] text-white px-6 py-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Credits & Billing</h2>
                <p className="text-xs text-blue-200">
                  Powered by Razorpay · UPI, Cards, NetBanking · Instant GST Invoice
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-blue-300">Available Balance</div>
                <div className="text-lg font-bold font-mono text-emerald-300">
                  {availableCredits.toLocaleString()} <span className="text-sm font-normal text-blue-200">credits</span>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Navigation Tabs ── */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 shrink-0 overflow-x-auto">
            {([
              { id: 'credits', label: 'Top-Up Credits', icon: PlusCircle },
              { id: 'plans', label: 'Practice Plans', icon: TrendingUp },
              { id: 'invoices', label: `GST Invoices (${userInvoices.length})`, icon: Receipt },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3.5 px-4 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-[#072654] text-[#072654]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}

            <div className="ml-auto pb-0 py-3 pl-4 hidden sm:flex">
              {onOpenReferralModal && (
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenReferralModal(); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer whitespace-nowrap"
                >
                  <Gift className="w-3.5 h-3.5" />
                  Refer & Earn +500 Credits
                </button>
              )}
            </div>
          </div>

          {/* ── Upgrade Banner ── */}
          {upgradeReason && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-sm text-amber-800 flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{upgradeReason}</span>
            </div>
          )}

          {/* ── Success Alert ── */}
          {topUpSuccessMsg && (
            <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{topUpSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition cursor-pointer whitespace-nowrap"
              >
                View Invoice
              </button>
            </div>
          )}

          {/* ── Body ── */}
          <div className="overflow-y-auto flex-1 p-6">

            {/* TAB 1: CREDIT TOP-UP PACKS */}
            {activeTab === 'credits' && (
              <div className="space-y-6">

                {/* Hero Balance Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-emerald-400 font-semibold mb-1">Your Credit Balance · Never Expires</div>
                    <div className="text-4xl font-bold font-mono tabular-nums">
                      {availableCredits.toLocaleString()}
                      <span className="text-lg font-normal text-slate-300 ml-2">credits</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                      Top-up anytime with instant B2B GST tax invoices (SAC 998314).
                      Each referral earns you +500 free credits.
                    </p>
                  </div>
                  {onOpenReferralModal && (
                    <button
                      type="button"
                      onClick={() => { onClose(); onOpenReferralModal?.(); }}
                      className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <Gift className="w-4 h-4" />
                      Get +500 Free Credits
                    </button>
                  )}
                </div>

                {/* Credit Packs Grid */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    Instant Top-Up Packs
                    <span className="text-xs font-normal text-slate-400 ml-1">All prices + 18% GST · Instant delivery</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {CREDIT_PACKS.map((pack) => {
                      const gstAmount = Math.round(pack.priceINR * GST_RATE);
                      const totalINR = pack.priceINR + gstAmount;
                      return (
                        <div
                          key={pack.id}
                          className={`relative rounded-2xl p-5 border transition flex flex-col ${
                            pack.popular
                              ? 'border-emerald-500 bg-emerald-50/40 shadow-sm shadow-emerald-100'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          {pack.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <span className="bg-emerald-500 text-white text-[11px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                                ⭐ Most Popular
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{pack.name}</div>
                            <div className="text-3xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
                              +{pack.credits.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">credits</div>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{pack.tagline}</p>
                          </div>

                          <div className="mt-4 pt-3.5 border-t border-slate-200">
                            <div className="flex items-end justify-between mb-3">
                              <div>
                                <div className="text-xl font-bold text-slate-900 font-mono">
                                  ₹{pack.priceINR.toLocaleString('en-IN')}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  +₹{gstAmount} GST = ₹{totalINR.toLocaleString('en-IN')} total
                                </div>
                              </div>
                              <div className="text-xs text-emerald-700 font-mono font-semibold">
                                ₹{(pack.priceINR / pack.credits).toFixed(2)}/cr
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenCreditPackCheckout(pack)}
                              className={`w-full py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                                pack.popular
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : 'bg-[#072654] hover:bg-[#0a3678] text-white'
                              }`}
                            >
                              <CreditCard className="w-4 h-4" />
                              Pay with Razorpay
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Top-Up */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-900 mb-0.5">Custom Credit Amount</div>
                      <p className="text-xs text-slate-500">₹0.75 per credit · Minimum 100 credits</p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {PRESET_CREDITS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCustomCreditsInput(String(preset))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                              Number(customCreditsInput) === preset
                                ? 'border-sky-500 bg-sky-50 text-sky-800'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            +{preset.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-2.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <input
                          type="number"
                          min={100}
                          max={50000}
                          step={100}
                          value={customCreditsInput}
                          onChange={(e) => setCustomCreditsInput(e.target.value)}
                          className="w-20 text-sm font-mono font-bold text-slate-900 outline-none bg-transparent"
                        />
                        <span className="text-xs text-slate-400">cr</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenCustomCreditCheckout}
                        className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition cursor-pointer whitespace-nowrap"
                      >
                        Pay ₹{customPriceINR.toLocaleString('en-IN')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Credit Usage Schedule */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500" />
                    Credit Usage Schedule
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'AI Schedule Mapping', cost: '5 Credits', detail: 'ICAI Notes 3–25 automation', color: 'text-sky-600' },
                      { label: 'Exception Scan', cost: '10 Credits', detail: 'Form 3CD/3CB anomaly detection', color: 'text-amber-600' },
                      { label: 'Excel Export', cost: '5 Credits', detail: 'Multi-sheet ICAI workbook', color: 'text-emerald-600' },
                    ].map((item) => (
                      <div key={item.label} className="bg-slate-50 rounded-xl p-3.5">
                        <div className="font-semibold text-slate-800 text-sm">{item.label}</div>
                        <div className={`font-bold text-base font-mono mt-0.5 ${item.color}`}>{item.cost}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CA PRACTICE PLANS */}
            {activeTab === 'plans' && (
              <div className="space-y-6">
                {/* Billing Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">CA Practice Subscription Plans</h3>
                    <p className="text-xs text-slate-500 mt-0.5">For high-volume CA firms seeking bundled credits & multi-partner access.</p>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl text-sm font-semibold shrink-0">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
                        billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-4 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                        billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Annual
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Save 17%</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
                    const isCurrentPlan = currentUser?.planTier === plan.id;
                    const PlanIcon = PLAN_ICONS[plan.id] || Zap;
                    const gradient = PLAN_GRADIENTS[plan.id] || 'from-slate-600 to-slate-800';

                    return (
                      <div
                        key={plan.id}
                        className={`rounded-2xl overflow-hidden border flex flex-col ${
                          plan.popular ? 'border-sky-400 shadow-md shadow-sky-100' : 'border-slate-200'
                        }`}
                      >
                        {/* Plan Header */}
                        <div className={`bg-gradient-to-br ${gradient} p-5 text-white`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                              <PlanIcon className="w-5 h-5 text-white" />
                            </div>
                            {plan.popular && (
                              <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
                                ⭐ Popular
                              </span>
                            )}
                            {isCurrentPlan && (
                              <span className="text-[11px] font-bold bg-emerald-400/30 text-emerald-200 px-2.5 py-0.5 rounded-full">
                                ✓ Active
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold">{plan.name}</h4>
                          <p className="text-xs text-white/70 mt-0.5">{plan.tagline}</p>
                          <div className="mt-3">
                            <div className="text-3xl font-bold font-mono">
                              {price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`}
                            </div>
                            {price > 0 && (
                              <div className="text-xs text-white/60 mt-0.5">
                                /{billingCycle === 'yearly' ? 'year' : 'month'} + 18% GST
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Plan Body */}
                        <div className="bg-white p-4 flex-1 flex flex-col">
                          <ul className="space-y-1.5 text-xs text-slate-600 flex-1">
                            {plan.features.slice(0, 6).map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span className={feat.highlight ? 'font-semibold text-slate-800' : ''}>{feat.text}</span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-4 pt-3 border-t border-slate-100">
                            {plan.id === 'free_trial' ? (
                              <div className={`py-2.5 px-4 text-center rounded-xl text-sm font-semibold ${
                                isCurrentPlan ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {isCurrentPlan ? '✓ Your Current Plan' : 'Free on Signup'}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenPlanCheckout(plan)}
                                className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                                  plan.popular
                                    ? 'bg-sky-600 hover:bg-sky-500 text-white'
                                    : 'bg-[#072654] hover:bg-[#0a3678] text-white'
                                }`}
                              >
                                <CreditCard className="w-4 h-4" />
                                {isCurrentPlan ? 'Renew Plan' : 'Subscribe Now'}
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: GST INVOICES */}
            {activeTab === 'invoices' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">GST Tax Invoices & Transaction History</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Official B2B Tax Invoices (SAC 998314) with Razorpay Payment & Order IDs</p>
                  </div>
                </div>

                {/* Invoice Detail Popup */}
                {selectedInvoiceForPrint && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <div className="text-xs text-slate-500">GST Tax Invoice · SAC 998314</div>
                        <h5 className="text-base font-bold text-slate-900 font-mono">{selectedInvoiceForPrint.invoiceNumber}</h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="py-1.5 px-3 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print / Save PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForPrint(null)}
                          className="py-1.5 px-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="space-y-0.5">
                        <div className="text-slate-500 font-semibold">Billed To</div>
                        <div className="font-bold text-slate-900 text-sm">
                          {selectedInvoiceForPrint.firmName || currentUser?.firmName || currentUser?.fullName}
                        </div>
                        {selectedInvoiceForPrint.gstin && (
                          <div className="font-mono text-slate-600">GSTIN: {selectedInvoiceForPrint.gstin}</div>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-slate-500 font-semibold">Payment Reference</div>
                        <div className="font-mono font-bold text-slate-900">{selectedInvoiceForPrint.transactionId}</div>
                        {selectedInvoiceForPrint.razorpayOrderId && (
                          <div className="font-mono text-slate-500">Order: {selectedInvoiceForPrint.razorpayOrderId}</div>
                        )}
                      </div>
                      <div className="space-y-0.5 sm:text-right">
                        <div className="text-slate-500 font-semibold">Amount Paid</div>
                        <div className="text-lg font-bold text-emerald-700 font-mono">
                          ₹{selectedInvoiceForPrint.totalAmount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-slate-400">
                          incl. ₹{selectedInvoiceForPrint.gstAmount.toLocaleString('en-IN')} GST
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoices List */}
                {userInvoices.length === 0 ? (
                  <div className="p-10 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-4">
                    <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center mx-auto">
                      <Receipt className="w-7 h-7 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-700">No Invoices Yet</div>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        Purchase a Credit Pack or Practice Plan to receive an instant GST-compliant invoice.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('credits')}
                      className="py-2 px-5 bg-[#072654] text-white rounded-xl text-sm font-semibold cursor-pointer inline-flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Top Up Credits
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
                          <th className="py-3 px-4 font-semibold">Invoice #</th>
                          <th className="py-3 px-4 font-semibold">Date</th>
                          <th className="py-3 px-4 font-semibold">Item</th>
                          <th className="py-3 px-4 font-semibold">Payment ID</th>
                          <th className="py-3 px-4 font-semibold text-right">GST</th>
                          <th className="py-3 px-4 font-semibold text-right">Total</th>
                          <th className="py-3 px-4 font-semibold text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 font-bold text-slate-900 font-mono text-xs">{inv.invoiceNumber}</td>
                            <td className="py-3 px-4 text-slate-500 text-xs font-mono">
                              {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3 px-4 text-slate-800 font-medium text-xs">{inv.planName}</td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-xs truncate max-w-[120px]">{inv.transactionId}</td>
                            <td className="py-3 px-4 text-right text-slate-500 font-mono text-xs">
                              ₹{inv.gstAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono text-xs">
                              ₹{inv.totalAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceForPrint(inv)}
                                className="text-xs text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Recent Credit Activity */}
                {currentUser?.creditTransactions && currentUser.creditTransactions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Recent Credit Activity</h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {currentUser.creditTransactions.slice(0, 10).map((tx) => (
                        <div key={tx.id} className="bg-white border border-slate-100 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-medium text-slate-700">{tx.description}</div>
                            <div className="text-slate-400 font-mono mt-0.5">
                              {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className={`font-bold font-mono text-sm ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Modal Footer ── */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Secured by Razorpay · PCI-DSS · 256-bit SSL · RBI Regulated</span>
            </div>
            <div className="font-mono text-[11px]">SAC: 998314</div>
          </div>
        </div>
      </div>

      {/* Razorpay Checkout Modal */}
      <RazorpayCheckoutModal
        isOpen={Boolean(checkoutItem)}
        onClose={() => setCheckoutItem(null)}
        item={checkoutItem}
        currentUser={currentUser}
        onPaymentSuccess={handleRazorpayPaymentSuccess}
      />
    </>
  );
};
