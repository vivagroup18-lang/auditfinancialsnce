import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Printer,
  Copy,
  Check,
  Tag,
  Building2,
  AlertCircle,
  Zap,
  CreditCard,
  Smartphone,
  Landmark,
  RefreshCw,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';
import {
  BillingCycle,
  SubscriptionTier,
  UserInvoice,
  UserProfile,
} from '../types';
import { PROMO_CODES, GST_RATE } from '../data/subscriptionPlans';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  launchOfficialRazorpayPopup,
  fetchRazorpayConfig,
  RazorpayGatewayConfig,
  CreateRazorpayOrderResponse,
} from '../services/razorpayService';

export interface RazorpayCheckoutItem {
  itemType: 'credit_pack' | 'subscription';
  itemId: string;
  itemName: string;
  tagline: string;
  basePriceINR: number;
  creditsGranted: number;
  planTier?: SubscriptionTier;
  billingCycle?: BillingCycle;
}

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RazorpayCheckoutItem | null;
  currentUser: UserProfile | null;
  onPaymentSuccess: (result: {
    invoice: UserInvoice;
    creditsGranted: number;
    item: RazorpayCheckoutItem;
  }) => void;
}

const QUICK_PROMO_CODES = PROMO_CODES.slice(0, 3);

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  onPaymentSuccess,
}) => {
  const [gatewayConfig, setGatewayConfig] = useState<RazorpayGatewayConfig | null>(null);
  const [firmName, setFirmName] = useState(currentUser?.firmName || '');
  const [gstin, setGstin] = useState(currentUser?.gstin || '');
  const [contactMobile, setContactMobile] = useState(currentUser?.mobile || '');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [showGstFields, setShowGstFields] = useState(false);

  const [orderData, setOrderData] = useState<CreateRazorpayOrderResponse | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedInvoice, setVerifiedInvoice] = useState<UserInvoice | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFirmName(currentUser?.firmName || '');
      setGstin(currentUser?.gstin || '');
      setContactMobile(currentUser?.mobile || '');
      setErrorMessage(null);
      setVerifiedInvoice(null);
      setOrderData(null);
      setAppliedPromoCode('');
      setPromoInput('');
      setPromoError(null);
      setPromoSuccess(null);
      setShowGstFields(false);

      fetchRazorpayConfig()
        .then((cfg) => setGatewayConfig(cfg))
        .catch(() => {});
    }
  }, [isOpen, currentUser, item]);

  const pricing = useMemo(() => {
    const base = item?.basePriceINR || 0;
    const matchedPromo = PROMO_CODES.find((p) => p.code === appliedPromoCode.toUpperCase());
    const discountPercent = matchedPromo ? matchedPromo.discountPercent : 0;
    const discountAmount = Math.round((base * discountPercent) / 100);
    const subtotal = Math.max(0, base - discountAmount);
    const gstAmount = Math.round(subtotal * GST_RATE);
    const totalAmount = subtotal + gstAmount;

    return {
      basePrice: base,
      discountPercent,
      discountAmount,
      subtotal,
      gstAmount,
      cgstAmount: Math.round(gstAmount / 2),
      sgstAmount: gstAmount - Math.round(gstAmount / 2),
      totalAmount,
      matchedPromo,
    };
  }, [item, appliedPromoCode]);

  // Create Razorpay Order whenever item or discount changes
  useEffect(() => {
    if (!isOpen || !item || verifiedInvoice) return;
    let cancelled = false;
    setIsCreatingOrder(true);
    createRazorpayOrder({
      itemType: item.itemType,
      itemId: item.itemId,
      itemName: item.itemName,
      planTier: item.planTier || currentUser?.planTier || 'free_trial',
      billingCycle: item.billingCycle || 'monthly',
      basePriceINR: item.basePriceINR,
      discountPercent: pricing.discountPercent,
      promoCode: appliedPromoCode || undefined,
      creditsGranted: item.creditsGranted,
      includeGst: true,
      customer: {
        userId: currentUser?.id || 'guest_ca',
        name: currentUser?.fullName || 'Chartered Accountant',
        email: currentUser?.email || 'ca@auditfinancials.local',
        contact: contactMobile,
        firmName,
        gstin,
      },
    })
      .then((res) => {
        if (!cancelled) {
          setOrderData(res);
          setIsCreatingOrder(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(err?.message || 'Could not initialize payment order');
          setIsCreatingOrder(false);
        }
      });
    return () => { cancelled = true; };
  }, [isOpen, item, pricing.discountPercent, appliedPromoCode]);

  if (!isOpen || !item) return null;

  const handleApplyPromo = (codeToApply?: string) => {
    setPromoError(null);
    setPromoSuccess(null);
    const clean = (codeToApply ?? promoInput).trim().toUpperCase();
    if (!clean) { setAppliedPromoCode(''); return; }
    const found = PROMO_CODES.find((p) => p.code === clean);
    if (!found) {
      setPromoError(`"${clean}" is not a valid promo code.`);
      return;
    }
    setPromoInput(clean);
    setAppliedPromoCode(clean);
    setPromoSuccess(`🎉 ${found.discountPercent}% discount applied!`);
  };

  const handleRemovePromo = () => {
    setAppliedPromoCode('');
    setPromoInput('');
    setPromoError(null);
    setPromoSuccess(null);
  };

  const handlePay = async () => {
    if (!orderData) return;
    setErrorMessage(null);

    if (gstin.trim() && gstin.trim().length !== 15) {
      setErrorMessage('GSTIN must be exactly 15 characters (e.g. 27AABCU9603R1ZM).');
      return;
    }

    setIsVerifying(true);

    // If live key is configured, launch official Razorpay popup
    if (gatewayConfig?.configured) {
      const launched = await launchOfficialRazorpayPopup({
        orderResponse: orderData,
        itemName: item.itemName,
        description: `+${item.creditsGranted.toLocaleString()} Credits — ${item.tagline}`,
        customer: {
          name: currentUser?.fullName || 'Chartered Accountant',
          email: currentUser?.email || 'ca@auditfinancials.local',
          contact: contactMobile || undefined,
          firmName: firmName.trim() || undefined,
          gstin: gstin.trim().toUpperCase() || undefined,
        },
        onSuccess: (verified) => {
          setIsVerifying(false);
          setVerifiedInvoice(verified.invoice);
          onPaymentSuccess({ invoice: verified.invoice, creditsGranted: item.creditsGranted, item });
        },
        onDismiss: () => { setIsVerifying(false); },
        onError: (msg) => { setIsVerifying(false); setErrorMessage(msg); },
      });
      if (!launched) {
        setIsVerifying(false);
        setErrorMessage('Could not open Razorpay. Please try again or contact support.');
      }
    } else {
      // Fallback verification for demo/sandbox
      try {
        const verified = await verifyRazorpayPayment({
          razorpay_order_id: orderData.orderId,
          paymentMethod: 'UPI',
          customer: {
            firmName: firmName.trim() || undefined,
            gstin: gstin.trim().toUpperCase() || undefined,
          },
        });
        setVerifiedInvoice(verified.invoice);
        setIsVerifying(false);
        onPaymentSuccess({ invoice: verified.invoice, creditsGranted: item.creditsGranted, item });
      } catch (err: any) {
        setIsVerifying(false);
        setErrorMessage(err?.message || 'Payment verification failed.');
      }
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const modeLabel =
    gatewayConfig?.mode === 'live' ? 'Live' :
    gatewayConfig?.mode === 'test' ? 'Test Mode' : 'Sandbox';

  const modeColor =
    gatewayConfig?.mode === 'live' ? 'text-emerald-400' :
    gatewayConfig?.mode === 'test' ? 'text-amber-400' : 'text-slate-400';

  // ─── Success / Invoice View ───────────────────────────────────────────────
  if (verifiedInvoice) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 px-7 py-8 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Payment Successful!</h2>
            <p className="text-emerald-100 text-sm mt-1">
              +{item.creditsGranted.toLocaleString()} credits added to your account
            </p>
            <div className="mt-4 inline-block bg-white/20 rounded-xl px-5 py-2 font-mono text-lg font-bold">
              ₹{verifiedInvoice.totalAmount.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-0.5">Invoice Number</div>
                <div className="font-bold text-slate-900 font-mono text-xs">{verifiedInvoice.invoiceNumber}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-0.5">Payment ID</div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 font-mono text-xs truncate">{verifiedInvoice.transactionId}</span>
                  <button onClick={() => handleCopy(verifiedInvoice.transactionId)} className="text-slate-400 hover:text-emerald-600 shrink-0">
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-0.5">Subtotal</div>
                <div className="font-semibold text-slate-900 font-mono text-xs">₹{verifiedInvoice.subtotal.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-0.5">GST @ 18%</div>
                <div className="font-semibold text-slate-900 font-mono text-xs">₹{verifiedInvoice.gstAmount.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print GST Invoice
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition cursor-pointer"
              >
                Done ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Checkout View ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#072654] to-[#0f4090] px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black text-xs">RZP</div>
              <div>
                <div className="text-sm font-bold">Razorpay Secure Checkout</div>
                <div className={`text-xs ${modeColor} font-medium`}>{modeLabel} · PCI-DSS Secured</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Item Summary */}
          <div className="bg-white/10 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-bold text-white text-base leading-tight">{item.itemName}</div>
                <div className="text-white/70 text-xs mt-0.5">{item.tagline}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-500/30 text-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  +{item.creditsGranted.toLocaleString()} Credits · Never Expires
                </div>
              </div>
              <div className="text-right shrink-0">
                {pricing.discountAmount > 0 && (
                  <div className="text-white/50 text-xs line-through font-mono">
                    ₹{pricing.basePrice.toLocaleString('en-IN')}
                  </div>
                )}
                <div className="text-2xl font-bold font-mono">
                  ₹{pricing.totalAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-white/60 text-xs">incl. 18% GST</div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Base Price</span>
              <span className="font-mono font-semibold text-slate-800">₹{pricing.basePrice.toLocaleString('en-IN')}</span>
            </div>
            {pricing.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Promo ({appliedPromoCode} · {pricing.discountPercent}% off)</span>
                <span className="font-mono">-₹{pricing.discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500 text-xs pt-1 border-t border-slate-200">
              <span>CGST 9% + SGST 9%</span>
              <span className="font-mono">₹{pricing.gstAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold text-base pt-1 border-t border-slate-200">
              <span>Total Payable</span>
              <span className="font-mono text-[#072654]">₹{pricing.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Promo Code */}
          <div className="space-y-2.5">
            {!appliedPromoCode ? (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                      placeholder="Promo code"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyPromo()}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {/* Quick code chips */}
                <div className="flex gap-2 flex-wrap">
                  {QUICK_PROMO_CODES.map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => handleApplyPromo(p.code)}
                      className="text-xs font-mono px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-sky-400 hover:text-sky-700 transition cursor-pointer"
                    >
                      {p.code} ({p.discountPercent}% off)
                    </button>
                  ))}
                </div>
                {promoError && <p className="text-xs text-rose-600">{promoError}</p>}
              </>
            ) : (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
                  <BadgeCheck className="w-4 h-4" />
                  <span>{promoSuccess}</span>
                </div>
                <button type="button" onClick={handleRemovePromo} className="text-xs text-slate-400 hover:text-rose-500 cursor-pointer transition">
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* B2B GST (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowGstFields(!showGstFields)}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer w-full"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="font-semibold">{showGstFields ? '▾' : '▸'} B2B GST Input Credit (optional — for CA firms)</span>
            </button>
            {showGstFields && (
              <div className="mt-2 grid gap-2">
                <input
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="CA Firm / Legal Entity Name"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                />
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="GSTIN (e.g. 27AABCU9603R1ZM)"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono uppercase text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                />
                <input
                  type="tel"
                  value={contactMobile}
                  onChange={(e) => setContactMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Mobile number (for OTP / UPI)"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}
          </div>

          {/* Payment Methods Badge Row */}
          <div className="flex items-center gap-3 py-1">
            <span className="text-xs text-slate-400 shrink-0">Accepts:</span>
            <div className="flex items-center gap-2.5 flex-wrap">
              {[
                { icon: Smartphone, label: 'UPI', color: 'text-emerald-600' },
                { icon: CreditCard, label: 'Cards', color: 'text-sky-600' },
                { icon: Landmark, label: 'NetBanking', color: 'text-amber-600' },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                  <m.icon className={`w-3 h-3 ${m.color}`} />
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <button
            type="button"
            onClick={handlePay}
            disabled={isCreatingOrder || isVerifying}
            className="w-full py-4 px-5 bg-gradient-to-r from-[#072654] to-[#1a4ba0] hover:from-[#0a3678] hover:to-[#235bc9] text-white rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
          >
            {isCreatingOrder ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Initializing…</span>
              </>
            ) : isVerifying ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Opening Razorpay…</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-sky-300" />
                <span>Pay ₹{pricing.totalAmount.toLocaleString('en-IN')} Securely</span>
                <Zap className="w-4 h-4 text-yellow-300" />
              </>
            )}
          </button>

          {/* Trust Footer */}
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>256-bit SSL</span>
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5 text-sky-500" />
              <span>PCI-DSS Compliant</span>
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <span>RBI Regulated</span>
          </div>

          {/* Order Reference */}
          {orderData && (
            <div className="text-center text-[10px] text-slate-300 font-mono">
              Order: {orderData.orderId} · SAC 998314
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
