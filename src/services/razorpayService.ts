import { BillingCycle, SubscriptionTier, UserInvoice } from '../types';

export interface RazorpayGatewayConfig {
  configured: boolean;
  keyId: string;
  mode: 'live' | 'test' | 'sandbox_ready';
  currency: 'INR';
  merchantName: string;
  gstRate: number;
  sacCode: string;
  supportedMethods: string[];
}

export interface CreateRazorpayOrderParams {
  itemType: 'credit_pack' | 'subscription';
  itemId: string;
  itemName: string;
  planTier?: SubscriptionTier;
  billingCycle?: BillingCycle;
  basePriceINR: number;
  discountPercent?: number;
  promoCode?: string;
  creditsGranted: number;
  includeGst?: boolean;
  customer: {
    userId: string;
    name: string;
    email: string;
    contact?: string;
    firmName?: string;
    gstin?: string;
  };
}

export interface CreateRazorpayOrderResponse {
  success: boolean;
  orderId: string;
  receipt: string;
  amount: number; // in paise
  amountINR: number;
  subtotalINR: number;
  gstAmountINR: number;
  discountAmountINR: number;
  currency: 'INR';
  keyId: string;
  isLiveGatewayOrder: boolean;
  mode: 'live' | 'test' | 'sandbox_ready';
}

export interface VerifyRazorpayPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  paymentMethod: 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Razorpay';
  customer?: {
    firmName?: string;
    gstin?: string;
  };
}

export interface VerifyRazorpayPaymentResponse {
  verified: boolean;
  signatureVerified: boolean;
  invoice: UserInvoice;
  order: any;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

/**
 * Ensures the official Razorpay Checkout.js SDK is loaded in the browser.
 */
export function ensureRazorpayCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(Boolean(window.Razorpay)));
      existingScript.addEventListener('error', () => resolve(false));
      // Fallback timeout in case load already fired
      setTimeout(() => resolve(Boolean(window.Razorpay)), 1500);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Fetches Razorpay Gateway Configuration from the server.
 */
export async function fetchRazorpayConfig(): Promise<RazorpayGatewayConfig> {
  const res = await fetch('/api/razorpay/config');
  if (!res.ok) {
    throw new Error('Failed to load Razorpay gateway configuration');
  }
  return res.json();
}

/**
 * Creates a new Razorpay Order on the backend server.
 */
export async function createRazorpayOrder(
  params: CreateRazorpayOrderParams
): Promise<CreateRazorpayOrderResponse> {
  const res = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create Razorpay order');
  }
  return data;
}

/**
 * Verifies a Razorpay payment signature (HMAC-SHA256) on the server and generates a GST Tax Invoice.
 */
export async function verifyRazorpayPayment(
  params: VerifyRazorpayPaymentParams
): Promise<VerifyRazorpayPaymentResponse> {
  const res = await fetch('/api/razorpay/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.verified) {
    throw new Error(data.error || 'Razorpay payment verification failed');
  }
  return data;
}

/**
 * Launches the official Razorpay Checkout.js popup when a live/test key is configured on the server.
 */
export async function launchOfficialRazorpayPopup(options: {
  orderResponse: CreateRazorpayOrderResponse;
  itemName: string;
  description: string;
  customer: {
    name: string;
    email: string;
    contact?: string;
    firmName?: string;
    gstin?: string;
  };
  onSuccess: (verified: VerifyRazorpayPaymentResponse) => void;
  onDismiss?: () => void;
  onError: (errMessage: string) => void;
}): Promise<boolean> {
  const sdkLoaded = await ensureRazorpayCheckoutScript();
  if (!sdkLoaded || !window.Razorpay) {
    return false;
  }

  const { orderResponse, itemName, description, customer, onSuccess, onDismiss, onError } = options;

  try {
    const rzpOptions = {
      key: orderResponse.keyId,
      amount: orderResponse.amount,
      currency: orderResponse.currency,
      name: 'AuditFinancials (ICAI NCE)',
      description: `${itemName} — ${description}`,
      order_id: orderResponse.isLiveGatewayOrder ? orderResponse.orderId : undefined,
      prefill: {
        name: customer.name,
        email: customer.email,
        contact: customer.contact ? `+91${customer.contact.replace(/^\+91/, '')}` : '',
      },
      notes: {
        firmName: customer.firmName || '',
        gstin: customer.gstin || '',
        orderId: orderResponse.orderId,
      },
      theme: {
        color: '#072654',
        backdrop_color: 'rgba(2, 6, 23, 0.85)',
        hide_topbar: false,
      },
      modal: {
        ondismiss: () => {
          if (onDismiss) onDismiss();
        },
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id?: string;
        razorpay_signature?: string;
      }) => {
        try {
          const verified = await verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id || orderResponse.orderId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            paymentMethod: 'Razorpay',
            customer: {
              firmName: customer.firmName,
              gstin: customer.gstin,
            },
          });
          onSuccess(verified);
        } catch (err: any) {
          onError(err?.message || 'Signature verification failed');
        }
      },
    };

    const rzpInstance = new window.Razorpay(rzpOptions);
    rzpInstance.on('payment.failed', (resp: any) => {
      const msg = resp?.error?.description || resp?.error?.reason || 'Razorpay payment failed';
      onError(msg);
    });
    rzpInstance.open();
    return true;
  } catch (err) {
    return false;
  }
}
