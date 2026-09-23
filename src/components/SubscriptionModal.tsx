import React, { useState } from 'react';
import {
  X,
  Check,
  Zap,
  ShieldCheck,
  Sparkles,
  Building2,
  Calendar,
  CreditCard,
  Tag,
  ArrowRight,
  Download,
  AlertCircle,
  Clock,
  ChevronRight,
  Receipt,
  FileCheck,
  CheckCircle2,
  Gift,
  PlusCircle,
  Coins,
} from 'lucide-react';
import {
  SubscriptionPlan,
  SubscriptionTier,
  BillingCycle,
  UserProfile,
  UserInvoice,
  CreditPack,
} from '../types';
import {
  SUBSCRIPTION_PLANS,
  PROMO_CODES,
  CREDIT_PACKS,
  CREDIT_COSTS,
  calculatePricingBreakdown,
  calculateNextExpiryDate,
  formatCurrencyINR,
} from '../data/subscriptionPlans';
import { updateUserSubscription, addCredits } from '../utils/storageManager';

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

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSubscriptionUpdated,
  onOpenReferralModal,
  initialSelectedTier,
  initialViewTab = 'plans',
  upgradeReason,
}) => {
  const [viewTab, setViewTab] = useState<'plans' | 'credits'>(initialViewTab);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionTier | null>(
    initialSelectedTier || null
  );
  const [checkoutStep, setCheckoutStep] = useState<'plans' | 'checkout' | 'success'>('plans');

  // Checkout form state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking'>('UPI');
  const [firmBillingName, setFirmBillingName] = useState(currentUser?.firmName || '');
  const [gstinNumber, setGstinNumber] = useState(currentUser?.gstin || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<UserInvoice | null>(null);
  const [topUpSuccessMsg, setTopUpSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTier: SubscriptionTier = currentUser?.planTier || 'free_trial';
  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === currentTier) || SUBSCRIPTION_PLANS[0];

  const targetPlan = selectedPlanId
    ? SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[1]
    : SUBSCRIPTION_PLANS[1];

  const pricing = calculatePricingBreakdown(targetPlan, billingCycle, appliedPromoCode || undefined);

  const handleApplyPromo = () => {
    setPromoError(null);
    const clean = promoCodeInput.trim().toUpperCase();
    if (!clean) return;
    const found = PROMO_CODES.find((p) => p.code === clean);
    if (found) {
      setAppliedPromoCode(found.code);
      setPromoCodeInput('');
    } else {
      setPromoError('Invalid promo code. Try "ICAI2025" for 20% off.');
    }
  };

  const handleStartUpgrade = (plan: SubscriptionPlan) => {
    if (plan.id === currentTier) return;
    setSelectedPlanId(plan.id);
    setCheckoutStep('checkout');
  };

  const handleBuyCreditPack = (pack: CreditPack) => {
    if (!currentUser) return;
    setIsProcessing(true);

    setTimeout(() => {
      const res = addCredits(
        currentUser.id,
        pack.credits,
        `Purchased ${pack.name} (+${pack.credits} Credits for ₹${pack.priceINR})`,
        'TOPUP'
      );

      if (res.success && res.user) {
        onSubscriptionUpdated(res.user);
        setTopUpSuccessMsg(`Successfully added ${pack.credits} credits to your balance!`);
        setTimeout(() => setTopUpSuccessMsg(null), 4000);
      }
      setIsProcessing(false);
    }, 600);
  };

  const handleCompletePayment = async () => {
    if (!currentUser) return;
    setIsProcessing(true);

    try {
      // Simulate realistic payment gateway processing delay
      await new Promise((res) => setTimeout(res, 900));

      const invNumber = `CA-INV-${Date.now().toString().slice(-6)}`;
      const newInvoice: UserInvoice = {
        id: 'inv_' + Math.random().toString(36).substring(2, 9),
        invoiceNumber: invNumber,
        date: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        planName: targetPlan.name,
        planTier: targetPlan.id,
        billingCycle,
        subtotal: pricing.subtotal,
        gstAmount: pricing.gstAmount,
        totalAmount: pricing.totalAmount,
        status: 'paid',
        paymentMethod,
        transactionId: `TXN_ICAI_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        firmName: firmBillingName.trim() || currentUser.firmName || 'Chartered Accountant',
        gstin: gstinNumber.trim() || undefined,
        notes: `Subscription to ${targetPlan.name} (${billingCycle}) with ${targetPlan.monthlyCredits} credits.`,
      };

      const updateRes = updateUserSubscription(
        currentUser.id,
        targetPlan.id,
        billingCycle,
        newInvoice
      );

      if (updateRes.success && updateRes.user) {
        // Also grant plan's monthly credits
        addCredits(
          currentUser.id,
          targetPlan.monthlyCredits,
          `Subscription tier grant: ${targetPlan.name} (+${targetPlan.monthlyCredits} credits)`,
          'SUBSCRIPTION_GRANT'
        );

        setGeneratedInvoice(newInvoice);
        onSubscriptionUpdated(updateRes.user);
        setCheckoutStep('success');
      }
    } catch (err) {
      console.error('Subscription checkout error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold shadow-sm">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Licensing & Claude-Style Credits
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  ICAI Compliance
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Statutory Non-Corporate Entity Financial Statement Automation for CAs & Audit Firms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Tabs Selector */}
        {checkoutStep === 'plans' && (
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-3 shrink-0 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewTab('plans')}
              className={`pb-3 transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                viewTab === 'plans'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Subscription Plans</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab('credits')}
              className={`pb-3 transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                viewTab === 'credits'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Claude-Style Credits & Top-Up</span>
              {currentUser && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                  ⚡ {currentUser.credits.toLocaleString()}
                </span>
              )}
            </button>

            {onOpenReferralModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReferralModal();
                }}
                className="pb-3 text-emerald-700 hover:text-emerald-800 ml-auto flex items-center gap-1.5 cursor-pointer"
              >
                <Gift className="w-4 h-4 text-emerald-600" />
                <span>Earn 500 Credits (Referrals)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Upgrade Reason Alert */}
        {upgradeReason && checkoutStep === 'plans' && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-xs text-amber-900 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">{upgradeReason}</span>
          </div>
        )}

        {/* Body Container */}
        <div className="overflow-y-auto p-6 flex-1 space-y-6">
          {topUpSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{topUpSuccessMsg}</span>
            </div>
          )}

          {checkoutStep === 'plans' && viewTab === 'credits' && (
            <div className="space-y-6">
              {/* Credit Status Hero */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 border border-slate-800 shadow-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
                      Claude-Style Credit Meter
                    </span>
                    <h3 className="text-3xl font-black text-white mt-1 flex items-center gap-2">
                      <span>⚡ {currentUser?.credits.toLocaleString() || 0}</span>
                      <span className="text-base font-normal text-slate-300">Credits Available</span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-lg">
                      Each statutory audit analysis, AI note mapping, and forensic diagnostic deducts credits from your balance. Credits never expire on active accounts.
                    </p>
                  </div>

                  {onOpenReferralModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenReferralModal();
                      }}
                      className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 rounded-2xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <Gift className="w-4 h-4" />
                      <span>Get 500 Free Credits</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Instant Top-Up Credit Packs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    <span>Instant Credit Top-Up Packs (Pay-as-you-go)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">No subscription required</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {CREDIT_PACKS.map((pack) => (
                    <div
                      key={pack.id}
                      className={`relative rounded-2xl p-5 border transition flex flex-col justify-between ${
                        pack.popular
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-md ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {pack.popular && (
                        <span className="absolute -top-2.5 right-4 bg-emerald-600 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                          Most Popular
                        </span>
                      )}

                      <div>
                        <div className="text-xs font-bold text-slate-700">{pack.name}</div>
                        <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-1">
                          <span>⚡ {pack.credits.toLocaleString()}</span>
                          <span className="text-xs font-semibold text-slate-500">Credits</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{pack.tagline}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-base font-black text-emerald-700">
                          ₹{pack.priceINR}
                        </span>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleBuyCreditPack(pack)}
                          className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          Top-Up
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credit Consumption Schedule */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>Transparent Credit Cost Schedule</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-900">AI Schedule Mapping</div>
                    <div className="text-emerald-700 font-black mt-0.5">5 Credits / Run</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Automated ICAI Note 3 to 25 mapping</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-900">Statutory Exception Scan</div>
                    <div className="text-emerald-700 font-black mt-0.5">10 Credits / Scan</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Form 3CD/3CB anomaly detection</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-900">Statutory Excel Export</div>
                    <div className="text-emerald-700 font-black mt-0.5">5 Credits / Export</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Multi-sheet formatted ICAI workbook</div>
                  </div>
                </div>
              </div>

              {/* Credit Transactions Ledger */}
              {currentUser?.creditTransactions && currentUser.creditTransactions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Recent Credit Activity Ledger
                  </h4>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {currentUser.creditTransactions.slice(0, 10).map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{tx.description}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(tx.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        <div
                          className={`font-black ${
                            tx.amount > 0 ? 'text-emerald-600' : 'text-slate-700'
                          }`}
                        >
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount} Credits
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {checkoutStep === 'plans' && viewTab === 'plans' && (
            <>
              {/* Billing Cycle Toggle */}
              <div className="flex justify-center mb-2">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                      billingCycle === 'monthly'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      billingCycle === 'yearly'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded-full">
                      Save 17%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {SUBSCRIPTION_PLANS.map((plan) => {
                  const isCurrent = plan.id === currentTier;
                  const price =
                    billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-3xl p-6 border flex flex-col justify-between relative transition ${
                        plan.popular
                          ? 'border-emerald-500 bg-white shadow-xl ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-white'
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-3 left-6 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full shadow-xs">
                          {plan.badge}
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-extrabold text-slate-900">{plan.name}</h4>
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold uppercase">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 min-h-[34px]">{plan.tagline}</p>

                        <div className="my-4 pb-4 border-b border-slate-200">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900">
                              {formatCurrencyINR(price)}
                            </span>
                            {price > 0 && (
                              <span className="text-xs text-slate-500 font-medium">
                                / {billingCycle === 'yearly' ? 'year' : 'month'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5" />
                            <span>⚡ {plan.monthlyCredits.toLocaleString()} Credits / month</span>
                          </div>
                        </div>

                        {/* Features List */}
                        <ul className="space-y-2 text-xs">
                          {plan.features.map((f, idx) => (
                            <li
                              key={idx}
                              className={`flex items-start gap-2 ${
                                f.included
                                  ? f.highlight
                                    ? 'text-slate-900 font-semibold'
                                    : 'text-slate-700'
                                  : 'text-slate-400 line-through'
                              }`}
                            >
                              <Check
                                className={`w-4 h-4 shrink-0 mt-0.5 ${
                                  f.included ? 'text-emerald-600' : 'text-slate-300'
                                }`}
                              />
                              <span>{f.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={isCurrent}
                          onClick={() => handleStartUpgrade(plan)}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                            isCurrent
                              ? 'bg-slate-200 text-slate-600 cursor-default'
                              : plan.popular
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
                          {!isCurrent && <ArrowRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Checkout Form View */}
          {checkoutStep === 'checkout' && (
            <div className="max-w-xl mx-auto space-y-5 animate-in fade-in">
              <button
                type="button"
                onClick={() => setCheckoutStep('plans')}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                ← Back to Plans
              </button>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Selected Plan</span>
                    <h4 className="text-lg font-black text-slate-900">{targetPlan.name}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900">
                      {formatCurrencyINR(pricing.totalAmount)}
                    </span>
                    <span className="block text-[10px] text-slate-500">incl. 18% GST</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Firm / Billing Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={firmBillingName}
                      onChange={(e) => setFirmBillingName(e.target.value)}
                      placeholder="M/s Balaji Rao & Co."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Firm GSTIN (For 18% Tax Credit)
                    </label>
                    <input
                      type="text"
                      value={gstinNumber}
                      onChange={(e) => setGstinNumber(e.target.value.toUpperCase())}
                      placeholder="27ABCDE1234F1Z5"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 uppercase focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Promo code */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Promo Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        placeholder="ICAI2025"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 uppercase focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                      >
                        Apply
                      </button>
                    </div>
                    {appliedPromoCode && (
                      <p className="text-[11px] text-emerald-700 font-bold mt-1">
                        Code "{appliedPromoCode}" applied!
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCompletePayment}
                  disabled={isProcessing}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-50"
                >
                  {isProcessing ? 'Activating Plan...' : `Pay ${formatCurrencyINR(pricing.totalAmount)} & Unlock Plan`}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Success Step */}
          {checkoutStep === 'success' && generatedInvoice && (
            <div className="max-w-md mx-auto text-center space-y-4 py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Subscription Upgraded!</h3>
              <p className="text-xs text-slate-600">
                You now have access to {targetPlan.name} with monthly credit allowance.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Return to Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
