import {
  Company,
  UserProfile,
  SubscriptionTier,
  BillingCycle,
  UserInvoice,
  CreditTransaction,
} from '../types';
import {
  REFERRAL_CREDIT_BONUS,
  NEW_USER_SIGNUP_CREDITS,
} from '../data/subscriptionPlans';
import {
  lookupReferrerInCloud,
  recordReferralRewardEvent,
  syncUserReferralToCloud,
  ensureReferredUserEventSynced,
  buildReferralEventId,
} from '../services/referralCloudService';

const defaultExpiry = new Date();
defaultExpiry.setDate(defaultExpiry.getDate() + 14);

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'guest_ca',
  userId: 'guest_ca',
  fullName: 'Guest Chartered Accountant',
  email: 'guest@auditfinancials.local',
  mobile: '',
  firmName: 'CA Practice Workspace',
  membershipNo: '',
  planTier: 'free_trial',
  subscriptionStatus: 'trial',
  subscriptionExpiresAt: defaultExpiry.toISOString(),
  billingCycle: 'monthly',
  credits: 555,
  referralCode: 'REF-GUEST555',
  referralsCount: 0,
  totalReferralCredits: 0,
  creditTransactions: [
    {
      id: 'tx_guest_welcome',
      date: new Date().toISOString(),
      amount: 555,
      type: 'SIGNUP_BONUS',
      description: 'Welcome bonus credit pool (555 free points)',
      balanceAfter: 555,
    },
  ],
  usage: {
    companiesCount: 0,
    maxCompanies: 9999,
    aiMappingsUsed: 0,
    maxAiMappings: 9999,
  },
  invoices: [],
};

const STORAGE_KEY_COMPANIES = 'ca_financial_automation_companies_v2';
const STORAGE_KEY_ACTIVE_ID = 'ca_financial_automation_active_company_id_v2';
const STORAGE_KEY_USERS = 'ca_financial_automation_users_v1';
const STORAGE_KEY_ACTIVE_USER_ID = 'ca_financial_automation_active_user_id_v1';
const STORAGE_KEY_PENDING_REFERRAL = 'ca_pending_referral_code';

/**
 * Generates a clean, deterministic referral code based on User ID or Email
 * so the same user gets the same code across devices.
 */
export function generateReferralCode(baseText: string): string {
  const clean = (baseText || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'CA';
  let hash = 0;
  const seed = (baseText || 'CA').toUpperCase().trim();
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 900;
  }
  const num = 100 + Math.abs(hash % 900);
  return `REF-${clean}${num}`;
}

/**
 * Automatically regenerates a username (userId) and readable full name (fullName)
 * based on the user's login ID / identifier (email, mobile, handle).
 */
export function deriveUserIdentityFromLoginId(
  loginId: string,
  existingFullName?: string
): { userId: string; fullName: string } {
  const trimmed = (loginId || '').trim();
  if (!trimmed || trimmed === 'guest_ca') {
    return { userId: 'guest_ca', fullName: 'Guest CA' };
  }

  let cleanHandle = '';
  let derivedName = '';

  // 1. Email identifier (e.g. "rohit.sharma@firm.com" or "ca.balaji@gmail.com")
  if (trimmed.includes('@')) {
    const prefix = trimmed.split('@')[0];
    cleanHandle = prefix
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '_')
      .replace(/^[._-]+|[._-]+$/g, '');
    const parts = prefix.split(/[._-]+/).filter(Boolean);
    derivedName = parts
      .map((p) => {
        if (p.toLowerCase() === 'ca') return 'CA';
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      })
      .join(' ');
  }
  // 2. Mobile identifier (e.g. "9876543210")
  else if (/^\+?[0-9]{8,15}$/.test(trimmed.replace(/[\s-]/g, ''))) {
    const digits = trimmed.replace(/\D/g, '');
    cleanHandle = `ca_${digits.slice(-4)}`;
    derivedName = `CA User (${digits.slice(-10)})`;
  }
  // 3. User ID handle (e.g. "ca_balaji" or "apex_audit" or "BalajiRao")
  else {
    cleanHandle = trimmed
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/[^a-z0-9_.-]/g, '_')
      .replace(/^[._-]+|[._-]+$/g, '');
    const parts = cleanHandle.split(/[._-]+/).filter(Boolean);
    derivedName = parts
      .map((p) => {
        if (p.toLowerCase() === 'ca') return 'CA';
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      })
      .join(' ');
  }

  if (!cleanHandle) cleanHandle = 'ca_user';
  if (!derivedName) derivedName = cleanHandle;

  // Preserve existing custom full name if it's already specific and not a generic placeholder
  const genericPlaceholders = [
    'practicing ca (guest)',
    'guest chartered accountant',
    'ca practice workspace',
    'guest ca',
    'guest_ca',
    'guest',
    'chartered accountant',
    'not signed in',
  ];
  const hasCustomName =
    existingFullName &&
    existingFullName.trim().length > 0 &&
    !genericPlaceholders.includes(existingFullName.trim().toLowerCase());

  const finalFullName = hasCustomName ? existingFullName!.trim() : derivedName;

  return {
    userId: cleanHandle,
    fullName: finalFullName,
  };
}

/**
 * Reads any pending referral code from URL (?ref=...), sessionStorage, or localStorage.
 */
export function getPendingReferralCode(): string {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get('ref');
      if (urlRef && urlRef.trim()) {
        return urlRef.trim();
      }
    }
  } catch {}
  try {
    const sRef = sessionStorage.getItem(STORAGE_KEY_PENDING_REFERRAL);
    if (sRef && sRef.trim()) return sRef.trim();
  } catch {}
  try {
    const lRef = localStorage.getItem(STORAGE_KEY_PENDING_REFERRAL);
    if (lRef && lRef.trim()) return lRef.trim();
  } catch {}
  return '';
}

/**
 * Persists a pending referral code in both sessionStorage and localStorage.
 */
export function setPendingReferralCode(code: string): void {
  const clean = (code || '').trim();
  if (!clean) return;
  try {
    sessionStorage.setItem(STORAGE_KEY_PENDING_REFERRAL, clean);
  } catch {}
  try {
    localStorage.setItem(STORAGE_KEY_PENDING_REFERRAL, clean);
  } catch {}
}

/**
 * Clears any pending referral code from sessionStorage, localStorage, and URL query string.
 */
export function clearPendingReferralCode(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY_PENDING_REFERRAL);
  } catch {}
  try {
    localStorage.removeItem(STORAGE_KEY_PENDING_REFERRAL);
  } catch {}
  try {
    if (typeof window !== 'undefined' && window.location.search.includes('ref=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  } catch {}
}

/**
 * Normalizes user profile with guaranteed subscription fields, quotas, credits, and referral info.
 * Automatically ensures every user (new or existing) receives the 555 welcome credit grant.
 */
export function normalizeUserProfile(u: any): UserProfile {
  if (!u) return { ...DEFAULT_USER_PROFILE };
  const planTier: SubscriptionTier = u.planTier || 'free_trial';
  const defaultMaxCompanies = 9999;
  const defaultMaxAi = 9999;

  const trialExpiry = new Date();
  trialExpiry.setDate(trialExpiry.getDate() + 14);

  const cleanId = u.id || 'user_' + Math.random().toString(36).substring(2, 9);
  const cleanUserId = u.userId || cleanId;
  let effectiveCredits = typeof u.credits === 'number' ? u.credits : NEW_USER_SIGNUP_CREDITS;
  const referralCode = u.referralCode || generateReferralCode(cleanUserId);

  let transactions: CreditTransaction[] = Array.isArray(u.creditTransactions)
    ? [...u.creditTransactions]
    : [];

  // Upgrade any legacy 100-credit welcome bonus to 555 welcome credit points
  const signupTxIdx = transactions.findIndex((tx) => tx && tx.type === 'SIGNUP_BONUS');
  if (signupTxIdx !== -1) {
    const existingBonus = Number(transactions[signupTxIdx].amount || 0);
    if (existingBonus < NEW_USER_SIGNUP_CREDITS) {
      const diff = NEW_USER_SIGNUP_CREDITS - existingBonus;
      effectiveCredits += diff;
      transactions[signupTxIdx] = {
        ...transactions[signupTxIdx],
        amount: NEW_USER_SIGNUP_CREDITS,
        description: `Welcome bonus credit pool (${NEW_USER_SIGNUP_CREDITS} free points)`,
        balanceAfter: Math.max(NEW_USER_SIGNUP_CREDITS, (transactions[signupTxIdx].balanceAfter || 0) + diff),
      };
    }
  } else {
    if (effectiveCredits <= 100) {
      effectiveCredits += NEW_USER_SIGNUP_CREDITS - 100;
    }
    transactions.push({
      id: 'tx_welcome_' + Date.now(),
      date: u.createdAt || new Date().toISOString(),
      amount: NEW_USER_SIGNUP_CREDITS,
      type: 'SIGNUP_BONUS',
      description: `Welcome bonus credit pool (${NEW_USER_SIGNUP_CREDITS} free points)`,
      balanceAfter: effectiveCredits,
    });
  }

  return {
    id: cleanId,
    userId: cleanUserId,
    fullName: u.fullName || 'Chartered Accountant',
    email: u.email || 'ca@auditfinancials.local',
    mobile: u.mobile || '',
    password: u.password,
    firmName: u.firmName || 'CA Practice Workspace',
    membershipNo: u.membershipNo || '',
    pan: u.pan || '',
    gstin: u.gstin || '',
    avatarUrl: u.avatarUrl,
    planTier,
    subscriptionStatus: u.subscriptionStatus || (planTier === 'free_trial' ? 'trial' : 'active'),
    subscriptionExpiresAt: u.subscriptionExpiresAt || trialExpiry.toISOString(),
    billingCycle: u.billingCycle || 'monthly',
    credits: effectiveCredits,
    referralCode,
    referredBy: u.referredBy,
    referralsCount: typeof u.referralsCount === 'number' ? u.referralsCount : 0,
    totalReferralCredits: typeof u.totalReferralCredits === 'number' ? u.totalReferralCredits : 0,
    creditTransactions: transactions,
    usage: {
      companiesCount: typeof u.usage?.companiesCount === 'number' ? u.usage.companiesCount : 0,
      maxCompanies:
        effectiveCredits > 0
          ? Math.max(typeof u.usage?.maxCompanies === 'number' ? u.usage.maxCompanies : defaultMaxCompanies, 9999)
          : typeof u.usage?.maxCompanies === 'number'
          ? u.usage.maxCompanies
          : defaultMaxCompanies,
      aiMappingsUsed: typeof u.usage?.aiMappingsUsed === 'number' ? u.usage.aiMappingsUsed : 0,
      maxAiMappings:
        effectiveCredits > 0
          ? Math.max(typeof u.usage?.maxAiMappings === 'number' ? u.usage.maxAiMappings : defaultMaxAi, 9999)
          : typeof u.usage?.maxAiMappings === 'number'
          ? u.usage.maxAiMappings
          : defaultMaxAi,
    },
    invoices: Array.isArray(u.invoices) ? u.invoices : [],
    createdAt: u.createdAt || new Date().toISOString(),
    lastLoginAt: u.lastLoginAt || new Date().toISOString(),
  };
}

/**
 * Loads all registered users from browser LocalStorage.
 */
export function loadUsersFromStorage(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((u: any) => u?.email !== 'vishalsutar7@gmail.com' && u?.userId !== 'vishalsutar7')
        .map(normalizeUserProfile);
    }
    return [];
  } catch (error) {
    console.warn('Failed to load users from LocalStorage:', error);
    return [];
  }
}

/**
 * Saves registered users array to LocalStorage
 */
export function saveUsersToStorage(users: UserProfile[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    return true;
  } catch (error) {
    console.warn('Failed to save users to LocalStorage:', error);
    return false;
  }
}

/**
 * Loads current logged-in user profile from LocalStorage.
 * Returns null if no user session is active — guest login only happens when explicitly chosen.
 */
export function loadActiveUserFromStorage(): UserProfile | null {
  try {
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_USER_ID);
    const users = loadUsersFromStorage();

    if (activeId) {
      const found = users.find((u) => u.id === activeId);
      if (found && (found.email === 'vishalsutar7@gmail.com' || found.userId === 'vishalsutar7' || found.id?.includes('VISHALSUTAR7'))) {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_USER_ID);
        const cleaned = users.filter((u) => u.email !== 'vishalsutar7@gmail.com' && u.userId !== 'vishalsutar7');
        saveUsersToStorage(cleaned);
        return null; // Force re-login
      } else if (found) {
        const normalized = normalizeUserProfile(found);
        saveUsersToStorage(users.map((u) => (u.id === normalized.id ? normalized : u)));
        return normalized;
      }
    }

    // No active session — return null so the app shows the login screen.
    // Guest login is only provisioned when the user explicitly clicks "Continue as Guest".
    return null;
  } catch (error) {
    console.warn('Failed to load active user profile:', error);
    return null;
  }
}

/**
 * Saves active logged-in User ID to LocalStorage
 */
export function saveActiveUserIdToStorage(userId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER_ID, userId);
  } catch (error) {
    console.error('Failed to save active user ID to LocalStorage:', error);
  }
}

/**
 * Clears active user session (Logout)
 */
export function logoutActiveUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_USER_ID);
  } catch (error) {
    console.error('Failed to clear active user session:', error);
  }
}

/**
 * Explicitly authenticates and provisions the user in Guest Mode.
 * This is ONLY called when the user explicitly clicks the "Continue as Guest" / "Guest Login" button.
 */
export function loginAsGuest(): UserProfile {
  const users = loadUsersFromStorage();
  const guestId = 'guest_ca';
  let guest = users.find((u) => u.id === guestId);

  const trialExpiry = new Date();
  trialExpiry.setDate(trialExpiry.getDate() + 14);

  if (!guest) {
    guest = normalizeUserProfile({
      ...DEFAULT_USER_PROFILE,
      id: guestId,
      userId: 'guest_ca',
      fullName: 'Guest CA',
      email: 'guest@auditfinancials.local',
      planTier: 'free_trial',
      subscriptionStatus: 'trial',
      subscriptionExpiresAt: trialExpiry.toISOString(),
      credits: NEW_USER_SIGNUP_CREDITS,
      lastLoginAt: new Date().toISOString(),
    });
    users.push(guest);
  } else {
    guest.lastLoginAt = new Date().toISOString();
  }

  saveUsersToStorage(users);
  saveActiveUserIdToStorage(guest.id);
  return guest;
}

/**
 * Updates full user profile details.
 */
export function updateUserProfile(updated: UserProfile): boolean {
  try {
    const users = loadUsersFromStorage();
    const idx = users.findIndex((u) => u.id === updated.id);
    if (idx === -1) {
      users.push(normalizeUserProfile(updated));
    } else {
      users[idx] = normalizeUserProfile({ ...users[idx], ...updated });
    }
    saveUsersToStorage(users);
    return true;
  } catch (err) {
    console.error('Failed to update user profile:', err);
    return false;
  }
}

/**
 * Upgrades or changes subscription plan tier for a user.
 */
export function updateUserSubscription(
  userId: string,
  planTier: SubscriptionTier,
  billingCycle: BillingCycle,
  invoice?: UserInvoice
): { success: boolean; user?: UserProfile; error?: string } {
  try {
    const users = loadUsersFromStorage();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const maxCompanies = planTier === 'enterprise' ? 9999 : planTier === 'professional' ? 25 : 2;
    const maxAi = planTier === 'enterprise' ? 9999 : planTier === 'professional' ? 500 : 10;

    const expiry = new Date();
    if (billingCycle === 'yearly') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }

    user.planTier = planTier;
    user.subscriptionStatus = planTier === 'free_trial' ? 'trial' : 'active';
    user.billingCycle = billingCycle;
    user.subscriptionExpiresAt = expiry.toISOString();
    user.usage = {
      ...user.usage,
      maxCompanies,
      maxAiMappings: maxAi,
    };

    if (invoice) {
      if (!Array.isArray(user.invoices)) {
        user.invoices = [];
      }
      user.invoices.unshift(invoice);
    }

    saveUsersToStorage(users);
    return { success: true, user };
  } catch (err: any) {
    console.error('Failed to update user subscription:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Checks and records user resource consumption.
 */
export function recordUserUsage(
  userId: string,
  metric: 'companies' | 'aiMappings',
  count?: number
): { allowed: boolean; currentUsage: number; maxAllowed: number } {
  const users = loadUsersFromStorage();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return { allowed: true, currentUsage: 0, maxAllowed: 9999 };
  }

  const hasCredits = (typeof user.credits === 'number' ? user.credits : 0) > 0;

  if (metric === 'companies') {
    if (typeof count === 'number') {
      user.usage.companiesCount = count;
    } else {
      user.usage.companiesCount = (user.usage.companiesCount || 0) + 1;
    }
    saveUsersToStorage(users);
    return {
      allowed: hasCredits || user.usage.companiesCount <= user.usage.maxCompanies,
      currentUsage: user.usage.companiesCount,
      maxAllowed: hasCredits ? Math.max(user.usage.maxCompanies || 9999, 9999) : user.usage.maxCompanies,
    };
  } else {
    const increment = typeof count === 'number' ? count : 1;
    user.usage.aiMappingsUsed = (user.usage.aiMappingsUsed || 0) + increment;
    saveUsersToStorage(users);
    return {
      allowed: hasCredits || user.usage.aiMappingsUsed <= user.usage.maxAiMappings,
      currentUsage: user.usage.aiMappingsUsed,
      maxAllowed: hasCredits ? Math.max(user.usage.maxAiMappings || 9999, 9999) : user.usage.maxAiMappings,
    };
  }
}

/**
 * Checks if user is permitted to perform action under active plan limits.
 */
export function checkUserLimit(
  userId: string,
  metric: 'companies' | 'aiMappings',
  additional: number = 1
): { allowed: boolean; currentUsage: number; maxAllowed: number; remaining: number } {
  const users = loadUsersFromStorage();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return { allowed: true, currentUsage: 0, maxAllowed: 9999, remaining: 9999 };
  }

  const hasCredits = (typeof user.credits === 'number' ? user.credits : 0) > 0;

  if (metric === 'companies') {
    const current = user.usage.companiesCount || 0;
    const max = hasCredits ? Math.max(user.usage.maxCompanies || 9999, 9999) : user.usage.maxCompanies || 2;
    const remaining = Math.max(0, max - current);
    return {
      allowed: hasCredits || current + additional <= max,
      currentUsage: current,
      maxAllowed: max,
      remaining,
    };
  } else {
    const current = user.usage.aiMappingsUsed || 0;
    const max = hasCredits ? Math.max(user.usage.maxAiMappings || 9999, 9999) : user.usage.maxAiMappings || 10;
    const remaining = Math.max(0, max - current);
    return {
      allowed: hasCredits || current + additional <= max,
      currentUsage: current,
      maxAllowed: max,
      remaining,
    };
  }
}

/**
 * Deducts credits for an AI or statutory export task (Claude-style).
 */
export function deductCredits(
  userId: string,
  cost: number,
  description: string,
  type: CreditTransaction['type']
): { success: boolean; remainingCredits: number; error?: string } {
  const users = loadUsersFromStorage();
  const user = users.find((u) => u.id === userId || u.userId === userId);
  if (!user) {
    return { success: true, remainingCredits: 999 }; // guest fallback
  }

  const current = typeof user.credits === 'number' ? user.credits : 0;
  if (current < cost) {
    return {
      success: false,
      remainingCredits: current,
      error: `Insufficient Credits: This operation requires ${cost} credits, but you have ${current} remaining. Upgrade your plan, top up credits, or invite colleagues for 500 free credits!`,
    };
  }

  user.credits = current - cost;
  if (!Array.isArray(user.creditTransactions)) {
    user.creditTransactions = [];
  }
  user.creditTransactions.unshift({
    id: 'tx_' + Math.random().toString(36).substring(2, 9),
    date: new Date().toISOString(),
    amount: -cost,
    type,
    description,
    balanceAfter: user.credits,
  });

  saveUsersToStorage(users);
  return { success: true, remainingCredits: user.credits };
}

/**
 * Adds credits to a user account (Top-up, Subscription renewal, or Referral reward).
 */
export function addCredits(
  userId: string,
  amount: number,
  description: string,
  type: CreditTransaction['type'],
  invoice?: UserInvoice,
  planUpdate?: { planTier: SubscriptionTier; billingCycle: BillingCycle }
): { success: boolean; user?: UserProfile; error?: string } {
  const users = loadUsersFromStorage();
  const user = users.find((u) => u.id === userId || u.userId === userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  user.credits = (typeof user.credits === 'number' ? user.credits : 0) + amount;
  if (!Array.isArray(user.creditTransactions)) {
    user.creditTransactions = [];
  }
  user.creditTransactions.unshift({
    id: 'tx_' + Math.random().toString(36).substring(2, 9),
    date: new Date().toISOString(),
    amount,
    type,
    description,
    balanceAfter: user.credits,
  });

  if (invoice) {
    if (!Array.isArray(user.invoices)) {
      user.invoices = [];
    }
    const existsIdx = user.invoices.findIndex((inv) => inv.id === invoice.id || inv.transactionId === invoice.transactionId);
    if (existsIdx === -1) {
      user.invoices.unshift(invoice);
    } else {
      user.invoices[existsIdx] = invoice;
    }
  }

  if (planUpdate) {
    const expiry = new Date();
    if (planUpdate.billingCycle === 'yearly') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }
    user.planTier = planUpdate.planTier;
    user.subscriptionStatus = planUpdate.planTier === 'free_trial' ? 'trial' : 'active';
    user.billingCycle = planUpdate.billingCycle;
    user.subscriptionExpiresAt = expiry.toISOString();
    user.usage = {
      ...user.usage,
      maxCompanies: 9999,
      maxAiMappings: 9999,
    };
  }

  saveUsersToStorage(users);
  return { success: true, user };
}

/**
 * Normalizes a referral input string (code, user handle with/without @, or email)
 */
export function sanitizeReferralInput(input: string): {
  raw: string;
  cleanNoPrefix: string;
  code: string;
  handle: string;
  email: string;
} {
  const raw = (input || '').trim();
  const cleanNoPrefix = raw.replace(/^[@#]/, '').trim();
  return {
    raw,
    cleanNoPrefix,
    code: cleanNoPrefix.toUpperCase(),
    handle: cleanNoPrefix.toLowerCase(),
    email: cleanNoPrefix.toLowerCase(),
  };
}

/**
 * Helper to find a local inviter user matching a referral code, handle, email, or 6-char prefix.
 */
function findLocalInviter(users: UserProfile[], code: string, handle: string, email: string): UserProfile | undefined {
  const codePrefix = code.replace(/^REF-/, '').replace(/[0-9]+$/, '');
  return users.find((u) => {
    if (u.id === 'guest_ca' && code !== 'REF-GUEST555') return false;
    const uCode = (u.referralCode || '').trim().toUpperCase();
    const uHandle = (u.userId || '').trim().toLowerCase().replace(/^@/, '');
    const uEmail = (u.email || '').trim().toLowerCase();
    const uEmailPrefix = uEmail.includes('@') ? uEmail.split('@')[0] : '';
    const uHandlePrefix = (uHandle || uEmailPrefix).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const uCodePrefix = uCode.replace(/^REF-/, '').replace(/[0-9]+$/, '');

    if (uCode && uCode === code) return true;
    if (uHandle && uHandle === handle) return true;
    if (uEmail && uEmail === email) return true;
    if (codePrefix.length >= 4 && (uHandlePrefix === codePrefix || uCodePrefix === codePrefix)) return true;
    return false;
  });
}

/**
 * Ensures a local inviter (if present on the same browser) is credited for referring `newUser`.
 */
function creditLocalInviterIfNeeded(localInviter: UserProfile, newUser: UserProfile): boolean {
  if (localInviter.id === newUser.id || localInviter.userId === newUser.userId) return false;
  if (localInviter.email && newUser.email && localInviter.email.toLowerCase() === newUser.email.toLowerCase()) {
    return false;
  }

  if (!Array.isArray(localInviter.creditTransactions)) {
    localInviter.creditTransactions = [];
  }

  const eventId = buildReferralEventId(
    localInviter.referralCode || localInviter.userId,
    newUser.email || newUser.userId || newUser.id
  );
  const refEmail = (newUser.email || '').trim().toLowerCase();
  const refUserId = (newUser.userId || newUser.id || '').trim().toLowerCase();

  const alreadyCredited = localInviter.creditTransactions.some((tx) => {
    if (tx.type !== 'REFERRAL_REWARD') return false;
    if (tx.id === `tx_${eventId}`) return true;
    const desc = (tx.description || '').toLowerCase();
    if (refEmail && desc.includes(refEmail)) return true;
    if (refUserId && desc.includes(`(${refUserId})`)) return true;
    return false;
  });

  if (alreadyCredited) return false;

  localInviter.credits =
    (typeof localInviter.credits === 'number' ? localInviter.credits : NEW_USER_SIGNUP_CREDITS) +
    REFERRAL_CREDIT_BONUS;
  localInviter.referralsCount = (localInviter.referralsCount || 0) + 1;
  localInviter.totalReferralCredits = (localInviter.totalReferralCredits || 0) + REFERRAL_CREDIT_BONUS;
  localInviter.creditTransactions.unshift({
    id: `tx_${eventId}`,
    date: new Date().toISOString(),
    amount: REFERRAL_CREDIT_BONUS,
    type: 'REFERRAL_REWARD',
    description: `+${REFERRAL_CREDIT_BONUS} Credits! Successfully referred ${newUser.fullName || newUser.userId} (${newUser.email || newUser.userId})`,
    balanceAfter: localInviter.credits,
  });

  return true;
}

/**
 * Applies a referral code/ID for a user, awarding 500 CREDITS to BOTH the inviter and the new user!
 * Supports matching by Referral Code (REF-...), User ID Handle (@ca_rajesh or ca_rajesh), or Email.
 * Synchronous version with immediate local update and background cloud event dispatch.
 */
export function applyReferralReward(
  newUserId: string,
  referralCodeInput: string
): { success: boolean; bonusGranted: number; inviterName?: string; error?: string } {
  const { raw, cleanNoPrefix, code, handle, email } = sanitizeReferralInput(referralCodeInput);
  if (!cleanNoPrefix) return { success: false, bonusGranted: 0, error: 'Referral identifier cannot be empty.' };

  const users = loadUsersFromStorage();
  const newUser = users.find((u) => u.id === newUserId || u.userId === newUserId);
  if (!newUser) {
    return { success: false, bonusGranted: 0, error: 'User account not found.' };
  }

  // Locate inviter locally if on the same browser
  const localInviter = findLocalInviter(users, code, handle, email);

  if (localInviter) {
    if (
      localInviter.id === newUser.id ||
      localInviter.userId === newUser.userId ||
      (localInviter.email && newUser.email && localInviter.email.toLowerCase() === newUser.email.toLowerCase())
    ) {
      return {
        success: false,
        bonusGranted: 0,
        error: 'You cannot use your own referral code or ID.',
      };
    }
  }

  // If newUser ALREADY claimed a referral earlier, still ensure the inviter gets credited (local & cloud)!
  if (newUser.referredBy) {
    if (localInviter) {
      const credited = creditLocalInviterIfNeeded(localInviter, newUser);
      if (credited) {
        saveUsersToStorage(users);
      }
    }
    ensureReferredUserEventSynced(newUser).catch(() => {});
    return {
      success: false,
      bonusGranted: 0,
      error: 'A referral code has already been claimed on this account.',
    };
  }

  // 1. Check local users first (handles same-device testing or pre-synced users)
  if (localInviter) {
    creditLocalInviterIfNeeded(localInviter, newUser);

    // Award New User 500 Credits
    newUser.credits = (typeof newUser.credits === 'number' ? newUser.credits : 0) + REFERRAL_CREDIT_BONUS;
    newUser.referredBy = localInviter.referralCode || code;
    if (!Array.isArray(newUser.creditTransactions)) newUser.creditTransactions = [];
    newUser.creditTransactions.unshift({
      id: 'tx_ref_new_' + Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
      amount: REFERRAL_CREDIT_BONUS,
      type: 'REFERRED_WELCOME_BONUS',
      description: `+500 Referral Welcome Bonus using code/ID ${raw} from ${localInviter.fullName || localInviter.userId}`,
      balanceAfter: newUser.credits,
    });

    saveUsersToStorage(users);

    // Queue cloud & server event for cross-device synchronization
    recordReferralRewardEvent(
      {
        referralCode: localInviter.referralCode,
        userId: localInviter.userId,
        email: localInviter.email,
        fullName: localInviter.fullName,
      },
      {
        userId: newUser.userId || newUser.id,
        email: newUser.email || '',
        fullName: newUser.fullName,
      }
    ).catch(() => {});

    syncUserReferralToCloud(localInviter).catch(() => {});
    syncUserReferralToCloud(newUser).catch(() => {});

    return {
      success: true,
      bonusGranted: REFERRAL_CREDIT_BONUS,
      inviterName: localInviter.fullName,
    };
  }

  // 2. Cross-Device Fallback (Inviter is on another computer / cloud):
  // Grant New User 500 credits immediately so their onboarding is never blocked!
  // And dispatch cloud referral resolution & event in the background.
  newUser.credits = (typeof newUser.credits === 'number' ? newUser.credits : 0) + REFERRAL_CREDIT_BONUS;
  newUser.referredBy = code.startsWith('REF-') ? code : `REF-${code}`;
  if (!Array.isArray(newUser.creditTransactions)) newUser.creditTransactions = [];
  newUser.creditTransactions.unshift({
    id: 'tx_ref_new_' + Math.random().toString(36).substring(2, 9),
    date: new Date().toISOString(),
    amount: REFERRAL_CREDIT_BONUS,
    type: 'REFERRED_WELCOME_BONUS',
    description: `+500 Referral Welcome Bonus using referral ${raw}`,
    balanceAfter: newUser.credits,
  });

  saveUsersToStorage(users);

  // Background cloud resolution & event recording for User A
  lookupReferrerInCloud(raw)
    .then((cloudInviter) => {
      const targetInviter = cloudInviter || {
        referralCode: code.startsWith('REF-') ? code : `REF-${code}`,
        userId: handle,
        email: email.includes('@') ? email : undefined,
        fullName: 'Colleague',
      };
      return recordReferralRewardEvent(targetInviter, {
        userId: newUser.userId || newUser.id,
        email: newUser.email || '',
        fullName: newUser.fullName,
      });
    })
    .catch((err) => {
      console.warn('Background cloud referral resolution error:', err);
      recordReferralRewardEvent(
        { referralCode: code.startsWith('REF-') ? code : `REF-${code}`, userId: handle },
        {
          userId: newUser.userId || newUser.id,
          email: newUser.email || '',
          fullName: newUser.fullName,
        }
      ).catch(() => {});
    });

  syncUserReferralToCloud(newUser).catch(() => {});

  return {
    success: true,
    bonusGranted: REFERRAL_CREDIT_BONUS,
    inviterName: 'Colleague',
  };
}

/**
 * Asynchronous referral application with immediate Cloud verification.
 */
export async function applyReferralRewardAsync(
  newUserId: string,
  referralCodeInput: string
): Promise<{ success: boolean; bonusGranted: number; inviterName?: string; error?: string }> {
  const { raw, cleanNoPrefix, code, handle, email } = sanitizeReferralInput(referralCodeInput);
  if (!cleanNoPrefix) return { success: false, bonusGranted: 0, error: 'Referral identifier cannot be empty.' };

  const users = loadUsersFromStorage();
  const newUser = users.find((u) => u.id === newUserId || u.userId === newUserId);
  if (!newUser) {
    return { success: false, bonusGranted: 0, error: 'User account not found.' };
  }

  // 1. Try local match first
  const localInviter = findLocalInviter(users, code, handle, email);

  if (newUser.referredBy) {
    // If referral was already applied during Google/Email login right before OnboardingModal,
    // treat matching code as success and ensure the inviter is credited!
    if (localInviter) {
      if (creditLocalInviterIfNeeded(localInviter, newUser)) {
        saveUsersToStorage(users);
      }
    }
    await ensureReferredUserEventSynced(newUser);
    const existingRef = newUser.referredBy.toUpperCase();
    if (existingRef === code || existingRef === `REF-${code}` || (localInviter && localInviter.referralCode === existingRef)) {
      return {
        success: true,
        bonusGranted: REFERRAL_CREDIT_BONUS,
        inviterName: localInviter?.fullName || 'Colleague',
      };
    }
    return { success: false, bonusGranted: 0, error: 'A referral code has already been claimed on this account.' };
  }

  if (localInviter) {
    return applyReferralReward(newUserId, referralCodeInput);
  }

  // 2. Query Firestore & Server referral_directory
  let cloudInviter = null;
  try {
    cloudInviter = await lookupReferrerInCloud(raw);
  } catch (err) {
    console.warn('Cloud referrer lookup encountered error:', err);
  }

  const effectiveInviterName = cloudInviter?.fullName || 'Colleague';
  const effectiveInviterCode = cloudInviter?.referralCode || (code.startsWith('REF-') ? code : `REF-${code}`);

  if (
    cloudInviter &&
    (cloudInviter.userProfileId === newUser.id ||
      cloudInviter.userId === newUser.userId ||
      (cloudInviter.email && newUser.email && cloudInviter.email.toLowerCase() === newUser.email.toLowerCase()))
  ) {
    return {
      success: false,
      bonusGranted: 0,
      error: 'You cannot use your own referral code or ID.',
    };
  }

  // Award New User 500 Credits
  newUser.credits = (typeof newUser.credits === 'number' ? newUser.credits : 0) + REFERRAL_CREDIT_BONUS;
  newUser.referredBy = effectiveInviterCode;
  if (!Array.isArray(newUser.creditTransactions)) newUser.creditTransactions = [];
  newUser.creditTransactions.unshift({
    id: 'tx_ref_new_' + Math.random().toString(36).substring(2, 9),
    date: new Date().toISOString(),
    amount: REFERRAL_CREDIT_BONUS,
    type: 'REFERRED_WELCOME_BONUS',
    description: `+500 Referral Welcome Bonus using code/ID ${raw} from ${effectiveInviterName}`,
    balanceAfter: newUser.credits,
  });

  saveUsersToStorage(users);

  // Record cloud & server event for Inviter
  await recordReferralRewardEvent(
    cloudInviter || {
      referralCode: effectiveInviterCode,
      userId: handle,
      email: email.includes('@') ? email : undefined,
      fullName: effectiveInviterName,
    },
    {
      userId: newUser.userId || newUser.id,
      email: newUser.email || '',
      fullName: newUser.fullName,
    }
  );

  syncUserReferralToCloud(newUser).catch(() => {});

  return {
    success: true,
    bonusGranted: REFERRAL_CREDIT_BONUS,
    inviterName: effectiveInviterName,
  };
}

/**
 * Authenticates user by Email, Mobile Number, or User ID.
 * Also applies any pending referral code if user hasn't claimed a referral yet.
 */
export function authenticateUser(
  identifier: string,
  password?: string,
  referralCodeInput?: string
): { success: boolean; user?: UserProfile; referralClaimed?: boolean; error?: string } {
  const clean = identifier.trim().toLowerCase();
  if (!clean) {
    return { success: false, error: 'Please enter a valid Email, Mobile, or User ID.' };
  }

  const users = loadUsersFromStorage();

  let matched = users.find((u) => {
    const uEmail = u.email.trim().toLowerCase();
    const uMobile = u.mobile.replace(/[^0-9]/g, '');
    const uId = u.id.trim().toLowerCase();
    const uHandle = (u.userId || '').trim().toLowerCase().replace(/^@/, '');
    const cleanNoAt = clean.replace(/^@/, '');
    const cleanMobile = clean.replace(/[^0-9]/g, '');

    return (
      uEmail === clean ||
      uId === clean ||
      uHandle === cleanNoAt ||
      (cleanMobile.length >= 10 && uMobile.endsWith(cleanMobile.slice(-10)))
    );
  });

  // If no registered account found matching identifier, auto-provision user account with username regenerated from login ID
  if (!matched) {
    const identity = deriveUserIdentityFromLoginId(identifier);
    const newEmail = clean.includes('@') ? clean : `${identity.userId}@auditfinancials.local`;
    const newId = 'USER_' + identity.userId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 14);

    matched = normalizeUserProfile({
      id: newId,
      userId: identity.userId,
      fullName: identity.fullName,
      email: newEmail,
      mobile: clean.replace(/\D/g, '').length >= 10 ? clean.replace(/\D/g, '') : '',
      firmName: `${identity.fullName}'s CA Practice`,
      password: password || undefined,
      planTier: 'free_trial',
      subscriptionStatus: 'trial',
      subscriptionExpiresAt: trialExpiry.toISOString(),
      billingCycle: 'monthly',
      credits: NEW_USER_SIGNUP_CREDITS,
      referralCode: generateReferralCode(identity.userId),
      referralsCount: 0,
      totalReferralCredits: 0,
      creditTransactions: [
        {
          id: 'tx_welcome_' + Date.now(),
          date: new Date().toISOString(),
          amount: NEW_USER_SIGNUP_CREDITS,
          type: 'SIGNUP_BONUS',
          description: `Welcome bonus credit pool (${NEW_USER_SIGNUP_CREDITS} free points)`,
          balanceAfter: NEW_USER_SIGNUP_CREDITS,
        },
      ],
      usage: {
        companiesCount: 0,
        maxCompanies: 9999,
        aiMappingsUsed: 0,
        maxAiMappings: 9999,
      },
      invoices: [],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });

    users.push(matched);
  } else {
    // Password check if required and password was set
    if (matched.password && password && matched.password !== password) {
      return { success: false, error: 'Incorrect password entered.' };
    }

    // Automatically regenerate / sync username & full name based on the login identifier
    const identity = deriveUserIdentityFromLoginId(identifier, matched.fullName);
    if (!matched.userId || matched.userId === 'guest_ca' || matched.userId.startsWith('user_')) {
      matched.userId = identity.userId;
    }
    const genericPlaceholders = [
      'practicing ca (guest)',
      'guest chartered accountant',
      'ca practice workspace',
      'guest ca',
      'guest_ca',
      'guest',
      'chartered accountant',
      'not signed in',
    ];
    if (!matched.fullName || genericPlaceholders.includes(matched.fullName.trim().toLowerCase())) {
      matched.fullName = identity.fullName;
    }
  }

  matched.lastLoginAt = new Date().toISOString();
  saveUsersToStorage(users);

  let referralClaimed = false;
  const pendingReferral = referralCodeInput?.trim() || getPendingReferralCode();
  if (pendingReferral) {
    const refRes = applyReferralReward(matched.id, pendingReferral);
    if (refRes.success) {
      referralClaimed = true;
      clearPendingReferralCode();
    } else if (matched.referredBy) {
      clearPendingReferralCode();
    }
    const reloaded = loadUsersFromStorage().find((u) => u.id === matched!.id);
    if (reloaded) matched = reloaded;
  } else if (matched.referredBy) {
    // Ensure inviter reward event is synced even if referral was claimed in an earlier session
    const { code, handle, email } = sanitizeReferralInput(matched.referredBy);
    const allUsers = loadUsersFromStorage();
    const localInviter = findLocalInviter(allUsers, code, handle, email);
    if (localInviter && creditLocalInviterIfNeeded(localInviter, matched)) {
      saveUsersToStorage(allUsers);
    }
    ensureReferredUserEventSynced(matched).catch(() => {});
  }

  saveActiveUserIdToStorage(matched.id);
  syncUserReferralToCloud(matched).catch(() => {});
  return { success: true, user: matched, referralClaimed };
}

/**
 * Google Sign-In helper: Authenticates or creates account via Google email.
 * Applies pending referral code/ID if user is new or hasn't claimed referral yet.
 */
export function authenticateGoogleUser(googleData: {
  email: string;
  name?: string;
  picture?: string;
  referralCode?: string;
}): { success: boolean; user?: UserProfile; isNewUser?: boolean; referralClaimed?: boolean; error?: string } {
  const users = loadUsersFromStorage();
  const cleanEmail = googleData.email.trim().toLowerCase();

  let matched = users.find((u) => u.email.trim().toLowerCase() === cleanEmail);
  let isNew = false;

  const identity = deriveUserIdentityFromLoginId(cleanEmail, googleData.name);

  if (!matched) {
    isNew = true;
    const googleId = 'GOOGLE_' + identity.userId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 14);

    matched = normalizeUserProfile({
      id: googleId,
      userId: identity.userId,
      fullName: identity.fullName,
      email: cleanEmail,
      mobile: '',
      firmName: 'Chartered Accountant / Auditor',
      avatarUrl: googleData.picture,
      planTier: 'free_trial',
      subscriptionStatus: 'trial',
      subscriptionExpiresAt: trialExpiry.toISOString(),
      billingCycle: 'monthly',
      credits: NEW_USER_SIGNUP_CREDITS,
      referralCode: generateReferralCode(identity.userId),
      referralsCount: 0,
      totalReferralCredits: 0,
      usage: {
        companiesCount: 0,
        maxCompanies: 9999,
        aiMappingsUsed: 0,
        maxAiMappings: 9999,
      },
      invoices: [],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });
    users.push(matched);
    saveUsersToStorage(users);
  } else {
    if (googleData.picture && !matched.avatarUrl) {
      matched.avatarUrl = googleData.picture;
    }
    if (!matched.userId || matched.userId === 'guest_ca' || matched.userId.startsWith('user_')) {
      matched.userId = identity.userId;
    }
    if (!matched.fullName || matched.fullName.toLowerCase().includes('guest')) {
      matched.fullName = identity.fullName;
    }
    matched.lastLoginAt = new Date().toISOString();
    saveUsersToStorage(users);
  }

  let referralClaimed = false;
  const pendingReferral = googleData.referralCode?.trim() || getPendingReferralCode();

  if (pendingReferral) {
    const refRes = applyReferralReward(matched.id, pendingReferral);
    if (refRes.success) {
      referralClaimed = true;
      clearPendingReferralCode();
    } else if (matched.referredBy) {
      clearPendingReferralCode();
    }
    const reloaded = loadUsersFromStorage().find((u) => u.id === matched!.id);
    if (reloaded) matched = reloaded;
  } else if (matched.referredBy) {
    const { code, handle, email } = sanitizeReferralInput(matched.referredBy);
    const allUsers = loadUsersFromStorage();
    const localInviter = findLocalInviter(allUsers, code, handle, email);
    if (localInviter && creditLocalInviterIfNeeded(localInviter, matched)) {
      saveUsersToStorage(allUsers);
    }
    ensureReferredUserEventSynced(matched).catch(() => {});
  }

  saveActiveUserIdToStorage(matched.id);
  syncUserReferralToCloud(matched).catch(() => {});

  return { success: true, user: matched, isNewUser: isNew || !matched.mobile, referralClaimed };
}

/**
 * Registers a new user account with unique User ID, Email, Mobile validations, and optional Referral Code.
 */
export function registerUser(
  newUser: Omit<UserProfile, 'createdAt' | 'usage' | 'subscriptionExpiresAt' | 'subscriptionStatus' | 'planTier' | 'billingCycle' | 'credits' | 'referralCode' | 'referralsCount' | 'totalReferralCredits' | 'creditTransactions'> & {
    planTier?: SubscriptionTier;
    billingCycle?: BillingCycle;
    referralCodeInput?: string;
  }
): { success: boolean; user?: UserProfile; referralClaimed?: boolean; error?: string } {
  const users = loadUsersFromStorage();

  const cleanId = newUser.id.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
  const cleanUserId = (newUser.userId || cleanId).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const cleanEmail = newUser.email.trim().toLowerCase();
  const cleanMobile = newUser.mobile ? newUser.mobile.replace(/[^0-9]/g, '') : '';

  if (!cleanUserId || cleanUserId.length < 3) {
    return { success: false, error: 'User ID must be at least 3 alphanumeric characters.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  // Check duplicates
  const existingId = users.find(
    (u) => u.id.toUpperCase() === cleanId || (u.userId && u.userId.toLowerCase() === cleanUserId)
  );
  if (existingId) {
    return { success: false, error: `User ID "${cleanUserId}" is already registered. Please choose another User ID.` };
  }

  const existingEmail = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existingEmail) {
    return { success: false, error: `Email address "${cleanEmail}" is already associated with another account.` };
  }

  if (cleanMobile && cleanMobile.length >= 10) {
    const existingMobile = users.find(
      (u) => u.mobile && u.mobile.replace(/[^0-9]/g, '').endsWith(cleanMobile.slice(-10))
    );
    if (existingMobile) {
      return { success: false, error: `Mobile number "${newUser.mobile}" is already registered.` };
    }
  }

  const planTier = newUser.planTier || 'free_trial';
  const trialExpiry = new Date();
  trialExpiry.setDate(trialExpiry.getDate() + 14);

  const userProfile: UserProfile = normalizeUserProfile({
    ...newUser,
    id: cleanId,
    userId: cleanUserId,
    email: cleanEmail,
    mobile: cleanMobile,
    planTier,
    subscriptionStatus: planTier === 'free_trial' ? 'trial' : 'active',
    subscriptionExpiresAt: trialExpiry.toISOString(),
    billingCycle: newUser.billingCycle || 'monthly',
    credits: NEW_USER_SIGNUP_CREDITS,
    referralCode: generateReferralCode(cleanUserId),
    referralsCount: 0,
    totalReferralCredits: 0,
    usage: {
      companiesCount: 0,
      maxCompanies: 9999,
      aiMappingsUsed: 0,
      maxAiMappings: 9999,
    },
    invoices: [],
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  });

  users.push(userProfile);
  saveUsersToStorage(users);
  saveActiveUserIdToStorage(userProfile.id);

  // If user entered a referral code or opened a referral link, apply reward (+500 credits to both!)
  const refCodeToUse = newUser.referralCodeInput?.trim() || getPendingReferralCode();

  if (refCodeToUse) {
    const refRes = applyReferralReward(userProfile.id, refCodeToUse);
    if (refRes.success) {
      clearPendingReferralCode();
    }
    const reloaded = loadUsersFromStorage().find((u) => u.id === userProfile.id);
    if (reloaded) {
      syncUserReferralToCloud(reloaded).catch(() => {});
      return { success: true, user: reloaded, referralClaimed: refRes.success };
    }
  }

  syncUserReferralToCloud(userProfile).catch(() => {});
  return { success: true, user: userProfile, referralClaimed: false };
}


/**
 * Resolves a normalized, unique storage partition key based on the user's email or ID.
 * - Authenticated Google / email user: 'user_' + sanitized_email (e.g. 'user_ca_rajesh_gmail_com')
 * - Fallback to user ID if no email: 'user_' + sanitized_id
 * - Guest / unauthenticated: 'guest'
 */
export function getUserStorageKey(user?: UserProfile | { email?: string; id?: string } | null): string {
  if (!user) return 'guest';
  if (user.email && user.email.trim()) {
    const cleanEmail = user.email.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (cleanEmail && cleanEmail !== 'guest_ca_auditfinancials_local') {
      return `user_${cleanEmail}`;
    }
  }
  if (user.id && user.id.trim()) {
    const cleanId = user.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanId.startsWith('guest_ca')) {
      return `user_${cleanId}`;
    }
  }
  return 'guest';
}

/**
 * Loads companies strictly belonging to the currently active user session.
 * Ensures:
 * 1. An authenticated user ONLY gets companies created by or belonging to their email.
 * 2. Another user logging in on the same browser CANNOT see other users' companies.
 * 3. Guest workspace is isolated from authenticated accounts.
 * 4. Safe migration for existing single-user companies without data loss.
 */
export function loadCompaniesForUserSession(user?: UserProfile | { email?: string; id?: string } | null): Company[] {
  const sessionKey = getUserStorageKey(user);
  const userStorageKey = `ca_companies_${sessionKey}_v2`;
  const currentUserEmail = user?.email?.trim().toLowerCase();

  try {
    // 1. Primary Check: User-partitioned storage key
    const raw = localStorage.getItem(userStorageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Defensive security filter: ensure no records belonging to another email leaked in
        if (currentUserEmail && sessionKey !== 'guest') {
          return parsed.filter((c: Company) => {
            if (!c?.id) return false;
            if (c.userEmail && c.userEmail !== 'guest') {
              return c.userEmail.trim().toLowerCase() === currentUserEmail;
            }
            // Untagged or guest company in this user's storage: automatically claim and keep
            c.userEmail = currentUserEmail;
            if (user?.id) c.userId = user.id;
            return true;
          });
        }
        // Guest session: only return guest or unowned companies
        return parsed
          .filter((c: Company) => !c.userEmail || c.userEmail === 'guest')
          .map((c: Company) => {
            const rawName = (c?.config?.entityName || '').trim().toUpperCase();
            if (!rawName || rawName === 'R R K & CO' || rawName === 'RRK & CO' || rawName.startsWith('R R K') || rawName.startsWith('RRK &')) {
              return {
                ...c,
                config: {
                  ...c.config,
                  entityName: 'Viva Group',
                },
              };
            }
            return c;
          });
      }
    }

    // 2. Safe Migration Fallback:
    // If this user has no partitioned records yet, check if there are legacy companies in global storage.
    // We only migrate companies that DO NOT belong to a different registered user!
    const legacyRaw = localStorage.getItem(STORAGE_KEY_COMPANIES);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
        let eligibleToMigrate: Company[] = [];

        if (currentUserEmail && sessionKey !== 'guest') {
          // For authenticated user: find companies explicitly matching their email OR untagged/guest
          eligibleToMigrate = legacyParsed
            .filter((c: Company) => {
              if (!c?.id) return false;
              if (c.userEmail && c.userEmail !== 'guest') {
                return c.userEmail.trim().toLowerCase() === currentUserEmail;
              }
              // If untagged or guest, migrate to this initial user
              return true;
            })
            .map((c: Company) => ({
              ...c,
              userEmail: currentUserEmail,
              userId: user?.id || c.userId,
            }));
        } else {
          // For guest: only untagged or guest companies
          eligibleToMigrate = legacyParsed.filter(
            (c: Company) => !c.userEmail || c.userEmail === 'guest'
          );
        }

        if (eligibleToMigrate.length > 0) {
          // Save into this user's isolated partition
          saveCompaniesForUserSession(eligibleToMigrate, user as any);
          return eligibleToMigrate;
        }
      }
    }

    return [];
  } catch (error) {
    console.error(`Failed to load companies for user session "${sessionKey}":`, error);
    return [];
  }
}

/**
 * Saves companies array strictly partitioned for the active user session.
 * Stamps each company with the current user's email and user ID.
 */
export function saveCompaniesForUserSession(
  companies: Company[],
  user?: UserProfile | { email?: string; id?: string } | null
): boolean {
  if (!Array.isArray(companies)) return false;
  const sessionKey = getUserStorageKey(user);
  const userStorageKey = `ca_companies_${sessionKey}_v2`;
  const currentUserEmail = user?.email?.trim().toLowerCase();
  const currentUserId = user?.id;

  try {
    // Stamp all companies with user ownership
    const stamped = companies.map((c) => ({
      ...c,
      userEmail: currentUserEmail && sessionKey !== 'guest' ? currentUserEmail : (c.userEmail || 'guest'),
      userId: currentUserId || c.userId,
    }));

    // Primary partitioned save
    const serialized = JSON.stringify(stamped);
    try {
      localStorage.setItem(userStorageKey, serialized);
    } catch (quotaError) {
      console.warn(`Storage quota exceeded for partition "${sessionKey}", compacting...`, quotaError);
      const compacted = stamped.map((c) => ({
        ...c,
        rawRows: (c.rawRows || []).slice(0, 500),
        pyRawRows: (c.pyRawRows || []).slice(0, 500),
      }));
      localStorage.setItem(userStorageKey, JSON.stringify(compacted));
    }

    // Secondary redundant fail-safe records (scoped by user partition)
    stamped.forEach((comp) => {
      if (comp?.id) {
        try {
          localStorage.setItem(`ca_comp_entry_${sessionKey}_${comp.id}`, JSON.stringify(comp));
        } catch {}
      }
    });

    return true;
  } catch (error) {
    console.error(`Failed to save companies for user session "${sessionKey}":`, error);
    return false;
  }
}

/**
 * Saves current active company ID for the user session
 */
export function saveActiveCompanyIdForUserSession(
  id: string,
  user?: UserProfile | { email?: string; id?: string } | null
): void {
  const sessionKey = getUserStorageKey(user);
  try {
    localStorage.setItem(`ca_active_comp_id_${sessionKey}`, id);
  } catch (error) {
    console.error(`Failed to save active company ID for "${sessionKey}":`, error);
  }
}

/**
 * Loads current active company ID for the user session
 */
export function loadActiveCompanyIdForUserSession(
  user?: UserProfile | { email?: string; id?: string } | null,
  companies?: Company[]
): string {
  const sessionKey = getUserStorageKey(user);
  try {
    const stored = localStorage.getItem(`ca_active_comp_id_${sessionKey}`);
    if (stored && companies && companies.some((c) => c.id === stored)) {
      return stored;
    }
    return companies && companies.length > 0 ? companies[0].id : '';
  } catch (error) {
    console.error(`Failed to load active company ID for "${sessionKey}":`, error);
    return companies && companies.length > 0 ? companies[0].id : '';
  }
}

/**
 * Loads saved companies strictly for a specific User ID (legacy support)
 */
export function loadCompaniesForUser(userId: string): Company[] {
  return loadCompaniesForUserSession({ id: userId });
}

/**
 * Saves companies array strictly for a specific User ID (legacy support)
 */
export function saveCompaniesForUser(userId: string, companies: Company[]): boolean {
  return saveCompaniesForUserSession(companies, { id: userId });
}

/**
 * Saves all companies array for active user session (with fallback)
 */
export function saveCompaniesToStorage(companies: Company[], user?: UserProfile | null): boolean {
  const activeUser = user || loadActiveUserFromStorage();
  return saveCompaniesForUserSession(companies, activeUser);
}

/**
 * Loads all saved companies for active user session (with fallback)
 */
export function loadCompaniesFromStorage(user?: UserProfile | null): Company[] {
  const activeUser = user || loadActiveUserFromStorage();
  return loadCompaniesForUserSession(activeUser);
}

/**
 * Saves current active company ID to LocalStorage
 */
export function saveActiveCompanyIdToStorage(id: string, user?: UserProfile | null): void {
  const activeUser = user || loadActiveUserFromStorage();
  saveActiveCompanyIdForUserSession(id, activeUser);
}

/**
 * Loads current active company ID from LocalStorage
 */
export function loadActiveCompanyIdFromStorage(user?: UserProfile | null, companies?: Company[]): string | null {
  const activeUser = user || loadActiveUserFromStorage();
  const id = loadActiveCompanyIdForUserSession(activeUser, companies);
  return id || null;
}

/**
 * Generates single company backup data object
 */
export function generateSingleCompanyBackupData(company: Company, currentUser?: UserProfile) {
  return {
    appName: 'CA Financial Statement Automation Agent',
    backupType: 'SINGLE_COMPANY_BACKUP',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    user: currentUser || DEFAULT_USER_PROFILE,
    activeCompanyId: company.id,
    totalCompanies: 1,
    companySummary: [
      {
        id: company.id,
        name: company.config.entityName || 'Unnamed Entity',
        entityType: company.config.entityType,
        financialYear: company.config.financialYear,
        cyLedgerCount: company.mappedLedgers?.length || company.rawRows?.length || 0,
        pyLedgerCount: company.pyMappedLedgers?.length || company.pyRawRows?.length || 0,
      },
    ],
    company,
    companies: [company],
  };
}

/**
 * Exports a single client company / working file as a dedicated Local JSON Backup file
 */
export function exportSingleCompanyBackup(
  company: Company,
  currentUser?: UserProfile
): { success: boolean; fileName: string; entityName: string } {
  if (!company || !company.config) {
    throw new Error('No valid company entity selected to back up.');
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  const backupData = generateSingleCompanyBackupData(company, currentUser);
  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const entityName = company.config.entityName || 'Entity';
  const cleanName = entityName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fy = (company.config.financialYear || '2025-26').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `CA_Audit_SINGLE_FILE_BACKUP_${cleanName}_FY_${fy}_${dateStr}_${timeStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    success: true,
    fileName,
    entityName,
  };
}

/**
 * Generates full workspace backup data object
 */
export function generateWorkspaceBackupData(companies: Company[], activeCompanyId: string, currentUser?: UserProfile) {
  return {
    appName: 'CA Financial Statement Automation Agent',
    backupType: 'TOTAL_LOCAL_WORKSPACE_BACKUP',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    user: currentUser || DEFAULT_USER_PROFILE,
    activeCompanyId,
    totalCompanies: companies.length,
    companySummary: companies.map((c) => ({
      id: c.id,
      name: c.config.entityName || 'Unnamed Entity',
      entityType: c.config.entityType,
      financialYear: c.config.financialYear,
      cyLedgerCount: c.mappedLedgers?.length || c.rawRows?.length || 0,
      pyLedgerCount: c.pyMappedLedgers?.length || c.pyRawRows?.length || 0,
    })),
    companies,
  };
}

/**
 * Exports complete application workspace as Total Local JSON Backup file containing all companies
 */
export function exportTotalLocalBackup(
  companies: Company[],
  activeCompanyId?: string,
  currentUser?: UserProfile
): { success: boolean; fileName: string; totalCompanies: number } {
  if (!companies || companies.length === 0) {
    throw new Error('No company entities found to back up. Please create or load a company first.');
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  const targetActiveId = activeCompanyId || companies[0]?.id || '';
  const backupData = generateWorkspaceBackupData(companies, targetActiveId, currentUser);

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const activeComp = companies.find((c) => c.id === targetActiveId);
  const activeName = (activeComp?.config.entityName || 'Entity').replace(/[^a-zA-Z0-9_-]/g, '_');

  const fileName =
    companies.length === 1
      ? `CA_Audit_TOTAL_LOCAL_BACKUP_${activeName}_${dateStr}.json`
      : `CA_Audit_TOTAL_LOCAL_BACKUP_All_${companies.length}_Companies_${dateStr}_${timeStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    success: true,
    fileName,
    totalCompanies: companies.length,
  };
}

/**
 * Exports complete application workspace as JSON Backup file
 */
export function exportWorkspaceBackup(companies: Company[], activeCompanyId: string, currentUser?: UserProfile): void {
  exportTotalLocalBackup(companies, activeCompanyId, currentUser);
}

/**
 * Parses and validates an uploaded JSON backup file (supports both Single File Backup and Total Workspace Backup)
 */
export function importWorkspaceBackup(fileContent: string): {
  success: boolean;
  backupType?: 'single' | 'total';
  companies?: Company[];
  activeCompanyId?: string;
  user?: UserProfile;
  error?: string;
} {
  try {
    const data = JSON.parse(fileContent);

    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid JSON backup format.' };
    }

    let importedCompanies: Company[] = [];
    let importedActiveId: string | undefined = undefined;
    let detectedType: 'single' | 'total' = 'total';

    if (Array.isArray(data)) {
      importedCompanies = data;
      detectedType = data.length === 1 ? 'single' : 'total';
    } else if (data.backupType === 'SINGLE_COMPANY_BACKUP') {
      detectedType = 'single';
      if (data.company && data.company.config) {
        importedCompanies = [data.company];
        importedActiveId = data.company.id;
      } else if (Array.isArray(data.companies)) {
        importedCompanies = data.companies;
        importedActiveId = data.activeCompanyId;
      }
    } else if (data.company && data.company.config) {
      // Single company backup format (e.g. from DrivePanel or single entity export)
      detectedType = 'single';
      importedCompanies = [
        {
          ...data.company,
          id: data.company.id || `comp-${Date.now()}`,
        },
      ];
      importedActiveId = importedCompanies[0].id;
    } else if (Array.isArray(data.companies)) {
      importedCompanies = data.companies;
      importedActiveId = data.activeCompanyId;
      detectedType =
        data.backupType === 'TOTAL_LOCAL_WORKSPACE_BACKUP' && data.companies.length > 1
          ? 'total'
          : data.companies.length === 1
          ? 'single'
          : 'total';
    } else if (data.config && data.id) {
      detectedType = 'single';
      importedCompanies = [data];
      importedActiveId = data.id;
    } else {
      return { success: false, error: 'Backup file does not contain valid company records.' };
    }

    if (importedCompanies.length === 0) {
      return { success: false, error: 'No company records found in backup file.' };
    }

    const validCompanies = importedCompanies
      .filter((c) => c && c.config && c.config.entityName)
      .map((c, idx) => ({
        ...c,
        id: c.id || `comp-restored-${Date.now()}-${idx}`,
      }));

    if (validCompanies.length === 0) {
      return { success: false, error: 'Company records in backup file are corrupted or invalid.' };
    }

    const targetActiveId =
      importedActiveId && validCompanies.some((c) => c.id === importedActiveId)
        ? importedActiveId
        : validCompanies[0].id;

    return {
      success: true,
      backupType: detectedType,
      companies: validCompanies,
      activeCompanyId: targetActiveId,
      user: data.user,
    };
  } catch (error: any) {
    console.error('Error restoring backup file:', error);
    return { success: false, error: `Failed to parse backup file: ${error.message}` };
  }
}

/**
 * Non-destructively merges restored company file(s) with the already working files in the app.
 * - Single File Restore: Adds the restored file to the already working files in the app.
 * - Total Backup Restore: Keeps all existing working files in the app and adds/merges all backup files without removing any working file.
 */
export function mergeRestoredCompanies(
  existingWorkingCompanies: Company[],
  restoredCompanies: Company[],
  options?: {
    backupType?: 'single' | 'total';
    duplicateStrategy?: 'add_as_new' | 'update_matching';
    preferredActiveId?: string;
    userEmail?: string;
    userId?: string;
  }
): {
  companies: Company[];
  activeCompanyId: string;
  addedCount: number;
  updatedCount: number;
} {
  const workingList: Company[] = Array.isArray(existingWorkingCompanies)
    ? [...existingWorkingCompanies]
    : [];
  const strategy = options?.duplicateStrategy || (options?.backupType === 'single' ? 'add_as_new' : 'update_matching');
  const cleanEmail = options?.userEmail?.trim().toLowerCase();
  const userId = options?.userId;

  let addedCount = 0;
  let updatedCount = 0;
  let resolvedActiveId = options?.preferredActiveId || '';

  restoredCompanies.forEach((rawRestored, idx) => {
    if (!rawRestored || !rawRestored.config) return;

    const stampedRestored: Company = {
      ...JSON.parse(JSON.stringify(rawRestored)),
      id: rawRestored.id || `comp-restored-${Date.now()}-${idx}`,
      userEmail: cleanEmail || rawRestored.userEmail,
      userId: userId || rawRestored.userId,
      updatedAt: new Date().toISOString(),
    };

    const existingIdx = workingList.findIndex((w) => w.id === stampedRestored.id);

    if (existingIdx === -1) {
      // Does not exist by ID -> add directly to working files in the app
      workingList.push(stampedRestored);
      addedCount++;
      if (!resolvedActiveId || rawRestored.id === options?.preferredActiveId || restoredCompanies.length === 1) {
        resolvedActiveId = stampedRestored.id;
      }
    } else if (strategy === 'add_as_new') {
      // Add as a new working file alongside the already working file in the app
      const newId = `comp-restored-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      const existingEntity = workingList[existingIdx];
      const sameNameAndFY =
        (existingEntity.config.entityName || '').trim().toLowerCase() ===
          (stampedRestored.config.entityName || '').trim().toLowerCase() &&
        existingEntity.config.financialYear === stampedRestored.config.financialYear;

      const addedCompany: Company = {
        ...stampedRestored,
        id: newId,
        config: {
          ...stampedRestored.config,
          entityName: sameNameAndFY
            ? `${stampedRestored.config.entityName} (Restored)`
            : stampedRestored.config.entityName,
        },
      };
      workingList.push(addedCompany);
      addedCount++;
      if (!resolvedActiveId || rawRestored.id === options?.preferredActiveId || restoredCompanies.length === 1) {
        resolvedActiveId = newId;
      }
    } else {
      // Update matching ID in-place while keeping all other working files in the app intact
      workingList[existingIdx] = stampedRestored;
      updatedCount++;
      if (!resolvedActiveId || rawRestored.id === options?.preferredActiveId || restoredCompanies.length === 1) {
        resolvedActiveId = stampedRestored.id;
      }
    }
  });

  if (!resolvedActiveId || !workingList.some((c) => c.id === resolvedActiveId)) {
    resolvedActiveId = workingList[workingList.length - 1]?.id || workingList[0]?.id || '';
  }

  return {
    companies: workingList,
    activeCompanyId: resolvedActiveId,
    addedCount,
    updatedCount,
  };
}

// =========================================================================
// Terms & Conditions Acceptance Tracking
// =========================================================================
export const CURRENT_TERMS_VERSION = '2026.3';
const STORAGE_KEY_TERMS_ACCEPTED_VERSION = 'ca_audit_terms_accepted_version_v3';
const STORAGE_KEY_TERMS_ACCEPTED_AT = 'ca_audit_terms_accepted_at_v3';

/**
 * Checks if user has accepted the current version of the Terms & Conditions
 */
export function hasAcceptedTerms(): boolean {
  try {
    const version = localStorage.getItem(STORAGE_KEY_TERMS_ACCEPTED_VERSION);
    return version === CURRENT_TERMS_VERSION;
  } catch {
    return false;
  }
}

/**
 * Records that user accepted the Terms & Conditions
 */
export function recordTermsAccepted(version: string = CURRENT_TERMS_VERSION): void {
  try {
    localStorage.setItem(STORAGE_KEY_TERMS_ACCEPTED_VERSION, version);
    localStorage.setItem(STORAGE_KEY_TERMS_ACCEPTED_AT, new Date().toISOString());
  } catch (e) {
    console.warn('Failed to record terms acceptance:', e);
  }
}

/**
 * Clears recorded terms acceptance (e.g., on sign-out)
 */
export function clearTermsAccepted(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_TERMS_ACCEPTED_VERSION);
    localStorage.removeItem(STORAGE_KEY_TERMS_ACCEPTED_AT);
  } catch (e) {
    console.warn('Failed to clear terms acceptance:', e);
  }
}

/**
 * Retrieves details on terms acceptance
 */
export function getTermsAcceptedInfo(): { accepted: boolean; version?: string; acceptedAt?: string } {
  try {
    const version = localStorage.getItem(STORAGE_KEY_TERMS_ACCEPTED_VERSION);
    const acceptedAt = localStorage.getItem(STORAGE_KEY_TERMS_ACCEPTED_AT);
    return {
      accepted: version === CURRENT_TERMS_VERSION,
      version: version || undefined,
      acceptedAt: acceptedAt || undefined,
    };
  } catch {
    return { accepted: false };
  }
}
