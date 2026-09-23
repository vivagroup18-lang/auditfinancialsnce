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
  credits: 100,
  referralCode: 'REF-GUEST100',
  referralsCount: 0,
  totalReferralCredits: 0,
  creditTransactions: [
    {
      id: 'tx_guest_welcome',
      date: new Date().toISOString(),
      amount: 100,
      type: 'SIGNUP_BONUS',
      description: 'Welcome bonus credit pool (100 free credits)',
      balanceAfter: 100,
    },
  ],
  usage: {
    companiesCount: 0,
    maxCompanies: 2,
    aiMappingsUsed: 0,
    maxAiMappings: 10,
  },
  invoices: [],
};

const STORAGE_KEY_COMPANIES = 'ca_financial_automation_companies_v2';
const STORAGE_KEY_ACTIVE_ID = 'ca_financial_automation_active_company_id_v2';
const STORAGE_KEY_USERS = 'ca_financial_automation_users_v1';
const STORAGE_KEY_ACTIVE_USER_ID = 'ca_financial_automation_active_user_id_v1';

/**
 * Generates a clean, memorable referral code based on User ID or Name
 */
export function generateReferralCode(baseText: string): string {
  const clean = baseText
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'CA';
  const rand = Math.floor(100 + Math.random() * 900);
  return `REF-${clean}${rand}`;
}

/**
 * Normalizes user profile with guaranteed subscription fields, quotas, credits, and referral info.
 */
export function normalizeUserProfile(u: any): UserProfile {
  if (!u) return { ...DEFAULT_USER_PROFILE };
  const planTier: SubscriptionTier = u.planTier || 'free_trial';
  const defaultMaxCompanies = planTier === 'enterprise' ? 9999 : planTier === 'professional' ? 25 : 2;
  const defaultMaxAi = planTier === 'enterprise' ? 9999 : planTier === 'professional' ? 500 : 10;

  const trialExpiry = new Date();
  trialExpiry.setDate(trialExpiry.getDate() + 14);

  const cleanId = u.id || 'user_' + Math.random().toString(36).substring(2, 9);
  const cleanUserId = u.userId || cleanId;
  const initialCredits = typeof u.credits === 'number' ? u.credits : NEW_USER_SIGNUP_CREDITS;
  const referralCode = u.referralCode || generateReferralCode(cleanUserId);

  const defaultLedger: CreditTransaction[] = [
    {
      id: 'tx_welcome_' + Date.now(),
      date: u.createdAt || new Date().toISOString(),
      amount: initialCredits,
      type: 'SIGNUP_BONUS',
      description: 'Welcome bonus credit pool (100 credits)',
      balanceAfter: initialCredits,
    },
  ];

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
    credits: initialCredits,
    referralCode,
    referredBy: u.referredBy,
    referralsCount: typeof u.referralsCount === 'number' ? u.referralsCount : 0,
    totalReferralCredits: typeof u.totalReferralCredits === 'number' ? u.totalReferralCredits : 0,
    creditTransactions: Array.isArray(u.creditTransactions) && u.creditTransactions.length > 0
      ? u.creditTransactions
      : defaultLedger,
    usage: {
      companiesCount: typeof u.usage?.companiesCount === 'number' ? u.usage.companiesCount : 0,
      maxCompanies: typeof u.usage?.maxCompanies === 'number' ? u.usage.maxCompanies : defaultMaxCompanies,
      aiMappingsUsed: typeof u.usage?.aiMappingsUsed === 'number' ? u.usage.aiMappingsUsed : 0,
      maxAiMappings: typeof u.usage?.maxAiMappings === 'number' ? u.usage.maxAiMappings : defaultMaxAi,
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
      return parsed.map(normalizeUserProfile);
    }
    return [];
  } catch (error) {
    console.error('Failed to load users from LocalStorage:', error);
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
    console.error('Failed to save users to LocalStorage:', error);
    return false;
  }
}

/**
 * Loads current logged-in user profile from LocalStorage.
 * Returns null if no user is currently authenticated.
 */
export function loadActiveUserFromStorage(): UserProfile | null {
  try {
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_USER_ID);
    if (!activeId) return null;
    const users = loadUsersFromStorage();
    const found = users.find((u) => u.id === activeId);
    return found ? normalizeUserProfile(found) : null;
  } catch (error) {
    console.error('Failed to load active user profile:', error);
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

  if (metric === 'companies') {
    if (typeof count === 'number') {
      user.usage.companiesCount = count;
    } else {
      user.usage.companiesCount = (user.usage.companiesCount || 0) + 1;
    }
    saveUsersToStorage(users);
    return {
      allowed: user.usage.companiesCount <= user.usage.maxCompanies,
      currentUsage: user.usage.companiesCount,
      maxAllowed: user.usage.maxCompanies,
    };
  } else {
    const increment = typeof count === 'number' ? count : 1;
    user.usage.aiMappingsUsed = (user.usage.aiMappingsUsed || 0) + increment;
    saveUsersToStorage(users);
    return {
      allowed: user.usage.aiMappingsUsed <= user.usage.maxAiMappings,
      currentUsage: user.usage.aiMappingsUsed,
      maxAllowed: user.usage.maxAiMappings,
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

  if (metric === 'companies') {
    const current = user.usage.companiesCount || 0;
    const max = user.usage.maxCompanies || 2;
    const remaining = Math.max(0, max - current);
    return {
      allowed: current + additional <= max,
      currentUsage: current,
      maxAllowed: max,
      remaining,
    };
  } else {
    const current = user.usage.aiMappingsUsed || 0;
    const max = user.usage.maxAiMappings || 10;
    const remaining = Math.max(0, max - current);
    return {
      allowed: current + additional <= max,
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
  type: CreditTransaction['type']
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

  if (newUser.referredBy) {
    return { success: false, bonusGranted: 0, error: 'A referral code has already been claimed on this account.' };
  }

  // 1. Check local users first (handles same-device testing or pre-synced users)
  const localInviter = users.find((u) => {
    const uCode = (u.referralCode || '').trim().toUpperCase();
    const uHandle = (u.userId || '').trim().toLowerCase().replace(/^@/, '');
    const uEmail = (u.email || '').trim().toLowerCase();

    return (
      (uCode && uCode === code) ||
      (uHandle && uHandle === handle) ||
      (uEmail && uEmail === email)
    );
  });

  if (localInviter) {
    if (localInviter.id === newUser.id || localInviter.userId === newUser.userId) {
      return {
        success: false,
        bonusGranted: 0,
        error: 'You cannot use your own referral code or ID.',
      };
    }

    // Award Inviter 500 Credits
    localInviter.credits = (typeof localInviter.credits === 'number' ? localInviter.credits : 0) + REFERRAL_CREDIT_BONUS;
    localInviter.referralsCount = (localInviter.referralsCount || 0) + 1;
    localInviter.totalReferralCredits = (localInviter.totalReferralCredits || 0) + REFERRAL_CREDIT_BONUS;
    if (!Array.isArray(localInviter.creditTransactions)) localInviter.creditTransactions = [];
    localInviter.creditTransactions.unshift({
      id: 'tx_ref_inv_' + Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
      amount: REFERRAL_CREDIT_BONUS,
      type: 'REFERRAL_REWARD',
      description: `+500 Credits! Successfully referred ${newUser.fullName || newUser.userId} (${newUser.userId || newUser.email})`,
      balanceAfter: localInviter.credits,
    });

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

    // Queue cloud event for cross-device synchronization
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
        referralCode: code,
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
        { referralCode: code, userId: handle },
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

  if (newUser.referredBy) {
    return { success: false, bonusGranted: 0, error: 'A referral code has already been claimed on this account.' };
  }

  // 1. Try local match first
  const localInviter = users.find((u) => {
    const uCode = (u.referralCode || '').trim().toUpperCase();
    const uHandle = (u.userId || '').trim().toLowerCase().replace(/^@/, '');
    const uEmail = (u.email || '').trim().toLowerCase();
    return (uCode && uCode === code) || (uHandle && uHandle === handle) || (uEmail && uEmail === email);
  });

  if (localInviter) {
    return applyReferralReward(newUserId, referralCodeInput);
  }

  // 2. Query Firestore referral_directory
  let cloudInviter = null;
  try {
    cloudInviter = await lookupReferrerInCloud(raw);
  } catch (err) {
    console.warn('Cloud referrer lookup encountered error:', err);
  }

  const effectiveInviterName = cloudInviter?.fullName || 'Colleague';
  const effectiveInviterCode = cloudInviter?.referralCode || code;

  if (cloudInviter && (cloudInviter.userProfileId === newUser.id || cloudInviter.userId === newUser.userId)) {
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

  // Record cloud event for Inviter
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
 */
export function authenticateUser(
  identifier: string,
  password?: string
): { success: boolean; user?: UserProfile; error?: string } {
  const clean = identifier.trim().toLowerCase();
  const users = loadUsersFromStorage();

  const matched = users.find((u) => {
    const uEmail = u.email.trim().toLowerCase();
    const uMobile = u.mobile.replace(/[^0-9]/g, '');
    const uId = u.id.trim().toLowerCase();
    const cleanMobile = clean.replace(/[^0-9]/g, '');

    return (
      uEmail === clean ||
      uId === clean ||
      (cleanMobile.length >= 10 && uMobile.endsWith(cleanMobile.slice(-10)))
    );
  });

  if (!matched) {
    return {
      success: false,
      error: `No registered account found matching Email/Mobile/User ID: "${identifier}". Please create an account first.`,
    };
  }

  // Password check if required
  if (matched.password && password && matched.password !== password) {
    return { success: false, error: 'Incorrect password entered.' };
  }

  matched.lastLoginAt = new Date().toISOString();
  saveUsersToStorage(users);
  saveActiveUserIdToStorage(matched.id);
  syncUserReferralToCloud(matched).catch(() => {});
  return { success: true, user: matched };
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
}): { success: boolean; user?: UserProfile; isNewUser?: boolean; error?: string } {
  const users = loadUsersFromStorage();
  const cleanEmail = googleData.email.trim().toLowerCase();

  let matched = users.find((u) => u.email.trim().toLowerCase() === cleanEmail);
  let isNew = false;

  if (!matched) {
    isNew = true;
    const emailPrefix = cleanEmail.split('@')[0];
    const googleId = 'GOOGLE_' + emailPrefix.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const userHandle = emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const displayName = googleData.name || (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1));
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 14);

    matched = normalizeUserProfile({
      id: googleId,
      userId: userHandle,
      fullName: displayName,
      email: cleanEmail,
      mobile: '',
      firmName: 'Chartered Accountant / Auditor',
      avatarUrl: googleData.picture,
      planTier: 'free_trial',
      subscriptionStatus: 'trial',
      subscriptionExpiresAt: trialExpiry.toISOString(),
      billingCycle: 'monthly',
      credits: NEW_USER_SIGNUP_CREDITS,
      referralCode: generateReferralCode(userHandle),
      referralsCount: 0,
      totalReferralCredits: 0,
      usage: {
        companiesCount: 0,
        maxCompanies: 2,
        aiMappingsUsed: 0,
        maxAiMappings: 10,
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
    matched.lastLoginAt = new Date().toISOString();
    saveUsersToStorage(users);
  }

  // Check if a referral code is available to claim for this user
  if (!matched.referredBy) {
    const pendingReferral = googleData.referralCode?.trim() || (() => {
      try {
        return sessionStorage.getItem('ca_pending_referral_code') || '';
      } catch {
        return '';
      }
    })();

    if (pendingReferral) {
      applyReferralReward(matched.id, pendingReferral);
      try {
        sessionStorage.removeItem('ca_pending_referral_code');
      } catch {}
      const reloaded = loadUsersFromStorage().find((u) => u.id === matched.id);
      if (reloaded) matched = reloaded;
    }
  }

  saveActiveUserIdToStorage(matched.id);
  syncUserReferralToCloud(matched).catch(() => {});

  return { success: true, user: matched, isNewUser: isNew || !matched.mobile };
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
): { success: boolean; user?: UserProfile; error?: string } {
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
      maxCompanies: planTier === 'enterprise' ? 9999 : planTier === 'professional' ? 25 : 2,
      aiMappingsUsed: 0,
      maxAiMappings: planTier === 'enterprise' ? 9999 : planTier === 'professional' ? 500 : 10,
    },
    invoices: [],
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  });

  users.push(userProfile);
  saveUsersToStorage(users);
  saveActiveUserIdToStorage(userProfile.id);

  // If user entered a referral code, apply reward (+500 credits to both!)
  const refCodeToUse = newUser.referralCodeInput?.trim() || (() => {
    try {
      return sessionStorage.getItem('ca_pending_referral_code') || '';
    } catch {
      return '';
    }
  })();

  if (refCodeToUse) {
    applyReferralReward(userProfile.id, refCodeToUse);
    try {
      sessionStorage.removeItem('ca_pending_referral_code');
    } catch {}
    // reload updated profile with credits
    const reloaded = loadUsersFromStorage().find((u) => u.id === userProfile.id);
    if (reloaded) {
      syncUserReferralToCloud(reloaded).catch(() => {});
      return { success: true, user: reloaded };
    }
  }

  syncUserReferralToCloud(userProfile).catch(() => {});
  return { success: true, user: userProfile };
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
            if (c.userEmail) {
              return c.userEmail.trim().toLowerCase() === currentUserEmail;
            }
            // Untagged company in this user's storage: automatically claim and keep
            c.userEmail = currentUserEmail;
            if (user?.id) c.userId = user.id;
            return true;
          });
        }
        // Guest session: only return guest or unowned companies
        return parsed.filter((c: Company) => !c.userEmail || c.userEmail === 'guest');
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
          // For authenticated user: find companies explicitly matching their email OR untagged
          eligibleToMigrate = legacyParsed
            .filter((c: Company) => {
              if (!c?.id) return false;
              if (c.userEmail) {
                return c.userEmail.trim().toLowerCase() === currentUserEmail;
              }
              // If untagged, migrate to this initial user
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
 * Parses and validates an uploaded JSON backup file
 */
export function importWorkspaceBackup(fileContent: string): {
  success: boolean;
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

    if (Array.isArray(data)) {
      importedCompanies = data;
    } else if (Array.isArray(data.companies)) {
      importedCompanies = data.companies;
      importedActiveId = data.activeCompanyId;
    } else if (data.config && data.id) {
      importedCompanies = [data];
      importedActiveId = data.id;
    } else {
      return { success: false, error: 'Backup file does not contain valid company records.' };
    }

    if (importedCompanies.length === 0) {
      return { success: false, error: 'No company records found in backup file.' };
    }

    const validCompanies = importedCompanies.filter((c) => c && c.id && c.config && c.config.entityName);
    if (validCompanies.length === 0) {
      return { success: false, error: 'Company records in backup file are corrupted or invalid.' };
    }

    const targetActiveId = importedActiveId && validCompanies.some((c) => c.id === importedActiveId)
      ? importedActiveId
      : validCompanies[0].id;

    return {
      success: true,
      companies: validCompanies,
      activeCompanyId: targetActiveId,
      user: data.user,
    };
  } catch (error: any) {
    console.error('Error restoring backup file:', error);
    return { success: false, error: `Failed to parse backup file: ${error.message}` };
  }
}

// =========================================================================
// Terms & Conditions Acceptance Tracking
// =========================================================================
export const CURRENT_TERMS_VERSION = '2026.1';
const STORAGE_KEY_TERMS_ACCEPTED_VERSION = 'ca_audit_terms_accepted_version';
const STORAGE_KEY_TERMS_ACCEPTED_AT = 'ca_audit_terms_accepted_at';

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
