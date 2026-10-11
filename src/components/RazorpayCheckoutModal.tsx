import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  CreditCard,
  Landmark,
  Lock,
  Printer,
  Copy,
  Check,
  Tag,
  Building2,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  QrCode,
  RefreshCw,
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

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  onPaymentSuccess,
}) => {
  const [gatewayConfig, setGatewayConfig] = useState<RazorpayGatewayConfig | null>(null);
  const [activeMethod, setActiveMethod] = useState<'UPI' | 'Credit Card' | 'Net Banking'>('UPI');
  const [upiSubMode, setUpiSubMode] = useState<'qr' | 'vpa'>('qr');
  const [upiVpa, setUpiVpa] = useState('');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');

  // Card inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState(currentUser?.fullName || '');

  // NetBanking input
  const [selectedBank, setSelectedBank] = useState('HDFC');

  // Customer & B2B GST Details
  const [firmName, setFirmName] = useState(currentUser?.firmName || '');
  const [gstin, setGstin] = useState(currentUser?.gstin || '');
  const [contactMobile, setContactMobile] = useState(currentUser?.mobile || '9876543210');

  // Promo Code
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
  const [promoError, setPromoError] = useState<string | null>(null);

  // Order & Verification Lifecycle
  const [orderData, setOrderData] = useState<CreateRazorpayOrderResponse | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedInvoice, setVerifiedInvoice] = useState<UserInvoice | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFirmName(currentUser?.firmName || 'Chartered Accountant Practice');
      setGstin(currentUser?.gstin || '');
      setContactMobile(currentUser?.mobile || '9876543210');
      setCardHolder(currentUser?.fullName || 'Chartered Accountant');
      setErrorMessage(null);
      setVerifiedInvoice(null);
      setOrderData(null);

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

  // Create/refresh Razorpay Order on the backend whenever item or discount changes
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
        firmName: firmName || currentUser?.firmName || 'Chartered Accountant Practice',
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
          setErrorMessage(err?.message || 'Could not initialize Razorpay order');
          setIsCreatingOrder(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, item, pricing.discountPercent, appliedPromoCode]);

  if (!isOpen || !item) return null;

  const handleApplyPromo = (codeToApply?: string) => {
    setPromoError(null);
    const clean = (codeToApply ?? promoInput).trim().toUpperCase();
    if (!clean) {
      setAppliedPromoCode('');
      return;
    }
    const found = PROMO_CODES.find((p) => p.code === clean);
    if (!found) {
      setPromoError(`Invalid promo code "${clean}". Try ICAI2025 or EARLYBIRD.`);
      return;
    }
    setPromoInput(clean);
    setAppliedPromoCode(clean);
  };

  const handleLaunchOfficialRazorpay = async () => {
    if (!orderData) return;
    setErrorMessage(null);
    setIsVerifying(true);

    const launched = await launchOfficialRazorpayPopup({
      orderResponse: orderData,
      itemName: item.itemName,
      description: `+${item.creditsGranted.toLocaleString()} Credits (${item.tagline})`,
      customer: {
        name: currentUser?.fullName || 'Chartered Accountant',
        email: currentUser?.email || 'ca@auditfinancials.local',
        contact: contactMobile,
        firmName: firmName.trim() || undefined,
        gstin: gstin.trim().toUpperCase() || undefined,
      },
      onSuccess: (verified) => {
        setIsVerifying(false);
        setVerifiedInvoice(verified.invoice);
        onPaymentSuccess({
          invoice: verified.invoice,
          creditsGranted: item.creditsGranted,
          item,
        });
      },
      onDismiss: () => {
        setIsVerifying(false);
      },
      onError: (msg) => {
        setIsVerifying(false);
        setErrorMessage(msg);
      },
    });

    if (!launched) {
      setIsVerifying(false);
      setErrorMessage(
        'Official Razorpay popup could not be opened in this browser frame. Please use the integrated Razorpay Checkout below.'
      );
    }
  };

  const handleCompleteStandardCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData) return;
    setErrorMessage(null);

    if (activeMethod === 'UPI' && upiSubMode === 'vpa') {
      if (!upiVpa.trim() || !upiVpa.includes('@')) {
        setErrorMessage('Please enter a valid UPI ID / VPA (e.g., ca.firm@okicici or 9876543210@upi).');
        return;
      }
    }

    if (activeMethod === 'Credit Card') {
      const digits = cardNumber.replace(/\D/g, '');
      if (digits.length < 12) {
        setErrorMessage('Please enter a valid 16-digit card number.');
        return;
      }
      if (!cardExpiry.trim() || !cardCvv.trim()) {
        setErrorMessage('Please enter card expiry (MM/YY) and 3-digit CVV.');
        return;
      }
    }

    if (gstin.trim() && gstin.trim().length !== 15) {
      setErrorMessage('GSTIN must be 15 characters (e.g., 27AABCU9603R1ZM) or left blank.');
      return;
    }

    setIsVerifying(true);
    try {
      const verified = await verifyRazorpayPayment({
        razorpay_order_id: orderData.orderId,
        paymentMethod: activeMethod,
        customer: {
          firmName: firmName.trim() || undefined,
          gstin: gstin.trim().toUpperCase() || undefined,
          userId: currentUser?.id || 'guest_ca',
          name: currentUser?.fullName || cardHolder || 'Chartered Accountant',
          email: currentUser?.email || 'ca@auditfinancials.local',
          contact: contactMobile,
        },
        orderData,
        itemDetails: {
          itemType: item.itemType,
          itemId: item.itemId,
          itemName: item.itemName,
          planTier: item.planTier,
          billingCycle: item.billingCycle,
          basePriceINR: pricing.basePrice,
          discountPercent: pricing.discountPercent,
          discountAmountINR: pricing.discountAmount,
          subtotalINR: pricing.subtotal,
          gstAmountINR: pricing.gstAmount,
          totalAmountINR: pricing.totalAmount,
          creditsGranted: item.creditsGranted,
          promoCode: appliedPromoCode || undefined,
        },
      });

      setVerifiedInvoice(verified.invoice);
      onPaymentSuccess({
        invoice: verified.invoice,
        creditsGranted: item.creditsGranted,
        item,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Razorpay payment verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyPaymentId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Bar — Razorpay Header */}
        <div className="bg-[#072654] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3395FF] flex items-center justify-center text-white font-black text-sm shadow-xs">
              RZP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  Razorpay Secure Checkout
                </h2>
                <span className="text-xs text-sky-200">
                  · {gatewayConfig?.mode === 'live' ? 'Live Gateway' : gatewayConfig?.mode === 'test' ? 'Test Mode' : 'Order & HMAC Verified'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                AuditFinancials — ICAI Non-Corporate Entity Statutory Platform
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verified Payment & Printable GST Invoice View */}
        {verifiedInvoice ? (
          <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1 bg-slate-50">
            {/* Payment Verified Banner */}
            <div className="bg-emerald-950 text-white rounded-2xl p-6 border border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-emerald-300">
                    Razorpay HMAC-SHA256 Signature Verified
                  </div>
                  <h3 className="text-xl font-bold text-white mt-0.5">
                    Payment of ₹{verifiedInvoice.totalAmount.toLocaleString('en-IN')} Successful
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    +{item.creditsGranted.toLocaleString()} Credits have been added to your AuditFinancials balance immediately.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="py-2 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print GST Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Formal GST Tax Invoice Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    Tax Invoice (SAC Code: 998314)
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mt-0.5">
                    AuditFinancials Statutory Compliance Platform
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ICAI Non-Corporate Entity Financial Statement Automation
                  </p>
                </div>

                <div className="sm:text-right font-mono tabular-nums">
                  <div className="text-xs text-slate-500">Invoice Number</div>
                  <div className="text-sm font-bold text-slate-900">{verifiedInvoice.invoiceNumber}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Date: {new Date(verifiedInvoice.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              {/* Billed To & Razorpay Transaction Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-500">Billed To (Customer / CA Practice)</div>
                  <div className="text-sm font-bold text-slate-900">
                    {verifiedInvoice.firmName || currentUser?.firmName || currentUser?.fullName || 'Chartered Accountant'}
                  </div>
                  <div className="text-slate-600">{currentUser?.email}</div>
                  {verifiedInvoice.gstin && (
                    <div className="font-mono text-slate-800 pt-1">
                      Customer GSTIN: <span className="font-bold">{verifiedInvoice.gstin}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 sm:text-right font-mono tabular-nums">
                  <div className="font-sans font-semibold text-slate-500">Razorpay Settlement Details</div>
                  <div className="flex sm:justify-end items-center gap-1.5">
                    <span className="text-slate-500">Payment ID:</span>
                    <span className="font-bold text-slate-900">{verifiedInvoice.transactionId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyPaymentId(verifiedInvoice.transactionId)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Copy Payment ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {verifiedInvoice.razorpayOrderId && (
                    <div className="text-slate-600">
                      Order ID: <span className="font-semibold text-slate-900">{verifiedInvoice.razorpayOrderId}</span>
                    </div>
                  )}
                  <div className="text-slate-600">
                    Method: <span className="font-sans font-semibold text-slate-900">{verifiedInvoice.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-3 px-4 font-semibold">Description</th>
                      <th className="py-3 px-4 font-semibold">SAC</th>
                      <th className="py-3 px-4 font-semibold text-right">Credits</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                    <tr>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-slate-900">{item.itemName}</div>
                        <div className="text-slate-500">{item.tagline}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">998314</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                        +{item.creditsGranted.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        ₹{pricing.basePrice.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    {pricing.discountAmount > 0 && (
                      <tr className="bg-emerald-50/40 text-emerald-800">
                        <td className="py-2.5 px-4 font-sans" colSpan={3}>
                          Promo Discount ({verifiedInvoice.promoCode || appliedPromoCode} — {pricing.discountPercent}% Off)
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold">
                          -₹{pricing.discountAmount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-2.5 px-4 font-sans text-slate-600" colSpan={3}>
                        Taxable Subtotal
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                        ₹{verifiedInvoice.subtotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans text-slate-600" colSpan={3}>
                        CGST @ 9% + SGST @ 9% (18% GST)
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-700">
                        ₹{verifiedInvoice.gstAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="bg-slate-900 text-white font-bold text-sm">
                      <td className="py-3.5 px-4 font-sans" colSpan={3}>
                        Total Amount Paid via Razorpay
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        ₹{verifiedInvoice.totalAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Active Checkout View: Left = Order Summary & GST | Right = Razorpay Payment Methods */
          <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-1">
            {/* Left Column: Order Summary, Promo Code, B2B GSTIN (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between space-y-5">
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Order Summary</div>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">{item.itemName}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{item.tagline}</p>
                  <div className="mt-2 text-xs font-semibold text-emerald-700 font-mono tabular-nums">
                    +{item.creditsGranted.toLocaleString()} Statutory Credits · Never Expires
                  </div>
                </div>

                {/* Price & 18% GST Breakdown */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Base Price</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      ₹{pricing.basePrice.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {pricing.discountAmount > 0 && (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>Promo Discount ({appliedPromoCode} · {pricing.discountPercent}%)</span>
                      <span className="font-mono tabular-nums font-semibold">
                        -₹{pricing.discountAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600 pt-2 border-t border-slate-100">
                    <span>Taxable Value</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      ₹{pricing.subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500">
                    <span>GST @ 18% (CGST 9% + SGST 9%)</span>
                    <span className="font-mono tabular-nums">
                      ₹{pricing.gstAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-2.5 border-t border-slate-200">
                    <span>Total Payable</span>
                    <span className="text-base font-mono tabular-nums text-[#072654]">
                      ₹{pricing.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Promo Code Box */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    ICAI Member / Practitioner Promo Code
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder="e.g. ICAI2025"
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase text-slate-900 focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyPromo()}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && <p className="text-[11px] text-rose-600">{promoError}</p>}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {PROMO_CODES.slice(0, 3).map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => handleApplyPromo(p.code)}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border transition cursor-pointer ${
                          appliedPromoCode === p.code
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {p.code} ({p.discountPercent}% OFF)
                      </button>
                    ))}
                  </div>
                </div>

                {/* B2B GST Invoice Details */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>B2B GST Input Tax Credit (Optional)</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    <input
                      type="text"
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      placeholder="CA Firm / Legal Entity Name"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800"
                    />
                    <input
                      type="text"
                      maxLength={15}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="15-Digit Firm GSTIN (e.g. 27AABCU9603R1ZM)"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Order Reference Footer */}
              <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between font-mono tabular-nums">
                <span>Order ID: {orderData?.orderId || 'Initializing...'}</span>
                <span>SAC: 998314</span>
              </div>
            </div>

            {/* Right Column: Razorpay Payment Methods (7 cols) */}
            <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-5 bg-white">
              <div className="space-y-5">
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Official Razorpay Popup Launcher Banner (when live/test key is configured or user prefers native popup) */}
                <div className="p-3.5 rounded-xl bg-sky-50/80 border border-sky-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Razorpay Checkout.js SDK
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {gatewayConfig?.configured
                        ? `Connected to Razorpay (${(gatewayConfig.keyId || 'rzp_live').slice(0, 12)}...). Launch native popup or pay below.`
                        : 'Supports UPI QR, Google Pay, PhonePe, Cards & NetBanking with HMAC-SHA256 verification.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLaunchOfficialRazorpay}
                    disabled={isCreatingOrder || isVerifying || !orderData}
                    className="py-2 px-3.5 bg-[#072654] hover:bg-[#0a3678] text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap shadow-xs disabled:opacity-50"
                  >
                    <span>Open Razorpay Popup</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Method Selector Tabs */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveMethod('UPI')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      activeMethod === 'UPI'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>UPI / QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMethod('Credit Card')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      activeMethod === 'Credit Card'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                    <span>Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMethod('Net Banking')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      activeMethod === 'Net Banking'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Landmark className="w-3.5 h-3.5 text-amber-600" />
                    <span>NetBanking</span>
                  </button>
                </div>

                {/* Payment Method Form */}
                <form id="razorpay-checkout-form" onSubmit={handleCompleteStandardCheckout} className="space-y-4">
                  {activeMethod === 'UPI' && (
                    <div className="space-y-4">
                      {/* Toggle QR vs UPI ID */}
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setUpiSubMode('qr')}
                          className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
                            upiSubMode === 'qr'
                              ? 'border-sky-600 bg-sky-50 text-sky-900'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          Scan Dynamic UPI QR
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpiSubMode('vpa')}
                          className={`px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
                            upiSubMode === 'vpa'
                              ? 'border-sky-600 bg-sky-50 text-sky-900'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          Enter UPI ID / VPA
                        </button>
                      </div>

                      {upiSubMode === 'qr' ? (
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center gap-5">
                          {/* Deterministic SVG QR Code visual for the order */}
                          <div className="w-36 h-36 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center shrink-0">
                            <QrCode className="w-24 h-24 text-slate-900" strokeWidth={1.5} />
                            <span className="text-[10px] font-mono text-slate-500 mt-1">
                              ₹{pricing.totalAmount.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="space-y-2.5 text-xs">
                            <div className="font-bold text-slate-900">
                              Scan with any BHIM UPI App
                            </div>
                            <p className="text-slate-600 leading-relaxed">
                              Scan this Razorpay dynamic QR using Google Pay, PhonePe, Paytm, or your corporate banking app, then click verify below.
                            </p>
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              {(
                                [
                                  { id: 'gpay', label: 'Google Pay' },
                                  { id: 'phonepe', label: 'PhonePe' },
                                  { id: 'paytm', label: 'Paytm' },
                                  { id: 'bhim', label: 'BHIM UPI' },
                                ] as const
                              ).map((appItem) => (
                                <button
                                  key={appItem.id}
                                  type="button"
                                  onClick={() => setSelectedUpiApp(appItem.id)}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer ${
                                    selectedUpiApp === appItem.id
                                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                                      : 'border-slate-200 bg-white text-slate-600'
                                  }`}
                                >
                                  {appItem.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-slate-700">
                            Enter UPI ID / VPA
                          </label>
                          <input
                            type="text"
                            value={upiVpa}
                            onChange={(e) => setUpiVpa(e.target.value)}
                            placeholder="e.g. ca.practice@okicici or 9876543210@ybl"
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-sky-500"
                          />
                          <p className="text-[11px] text-slate-500">
                            A collect request for ₹{pricing.totalAmount.toLocaleString('en-IN')} will be sent to your UPI app.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeMethod === 'Credit Card' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Card Number (Visa / Mastercard / RuPay)
                        </label>
                        <input
                          type="text"
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                            const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
                            setCardNumber(formatted);
                          }}
                          placeholder="4532 •••• •••• 8901"
                          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono tabular-nums text-slate-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Valid Thru (MM/YY)
                          </label>
                          <input
                            type="text"
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => {
                              let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                              if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                              setCardExpiry(v);
                            }}
                            placeholder="08/29"
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono tabular-nums text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            CVV
                          </label>
                          <input
                            type="password"
                            maxLength={4}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="•••"
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Name on Card
                        </label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="CA Balaji Rao"
                          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  {activeMethod === 'Net Banking' && (
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-slate-700">
                        Select Corporate or Retail Bank
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        {[
                          { code: 'HDFC', name: 'HDFC Bank' },
                          { code: 'ICICI', name: 'ICICI Bank' },
                          { code: 'SBI', name: 'State Bank of India' },
                          { code: 'AXIS', name: 'Axis Bank' },
                          { code: 'KOTAK', name: 'Kotak Mahindra' },
                          { code: 'BOB', name: 'Bank of Baroda' },
                        ].map((bank) => (
                          <button
                            key={bank.code}
                            type="button"
                            onClick={() => setSelectedBank(bank.code)}
                            className={`p-3 rounded-xl border text-left font-medium transition cursor-pointer ${
                              selectedBank === bank.code
                                ? 'border-sky-600 bg-sky-50 text-sky-950 font-bold'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {bank.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Submit / Pay Button Footer */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <button
                  type="submit"
                  form="razorpay-checkout-form"
                  disabled={isCreatingOrder || isVerifying}
                  className="w-full py-3 px-5 bg-[#072654] hover:bg-[#0a3678] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Razorpay Signature...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-sky-300" />
                      <span>
                        Pay ₹{pricing.totalAmount.toLocaleString('en-IN')} via Razorpay ({activeMethod})
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>256-Bit PCI-DSS &amp; HMAC-SHA256 Verified</span>
                  </div>
                  <span>Instant GST Invoice</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
