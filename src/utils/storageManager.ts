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
 * Applies a referral code for a user, awarding 500 CREDITS to BOTH the inviter and the new user!
 */
export function applyReferralReward(
  newUserId: string,
  referralCodeInput: string
): { success: boolean; bonusGranted: number; inviterName?: string; error?: string } {
  const cleanCode = referralCodeInput.trim().toUpperCase();
  if (!cleanCode) return { success: false, bonusGranted: 0, error: 'Referral code cannot be empty.' };

  const users = loadUsersFromStorage();
  const newUser = users.find((u) => u.id === newUserId || u.userId === newUserId);
  if (!newUser) {
    return { success: false, bonusGranted: 0, error: 'User not found' };
  }

  if (newUser.referredBy) {
    return { success: false, bonusGranted: 0, error: 'A referral code has already been claimed on this account.' };
  }

  // Find inviter by matching referralCode
  const inviter = users.find(
    (u) => u.referralCode && u.referralCode.toUpperCase() === cleanCode
  );

  if (!inviter) {
    return {
      success: false,
      bonusGranted: 0,
      error: `Invalid referral code "${cleanCode}". Please verify with the person who invited you.`,
    };
  }

  if (inviter.id === newUser.id || inviter.userId === newUser.userId) {
    return {
      success: false,
      bonusGranted: 0,
      error: 'You cannot use your own referral code.',
    };
  }

  // 1. Award Inviter 500 Credits
  inviter.credits = (typeof inviter.credits === 'number' ? inviter.credits : 0) + REFERRAL_CREDIT_BONUS;
  inviter.referralsCount = (inviter.referralsCount || 0) + 1;
  inviter.totalReferralCredits = (inviter.totalReferralCredits || 0) + REFERRAL_CREDIT_BONUS;
  if (!Array.isArray(inviter.creditTransactions)) inviter.creditTransactions = [];
  inviter.creditTransactions.unshift({
    id: 'tx_ref_inv_' + Math.random().toString(36).substring(2, 9),
    date: new Date().toISOString(),
    amount: REFERRAL_CREDIT_BONUS,
    type: 'REFERRAL_REWARD',
    description: `+500 Credits! Successfully referred ${newUser.fullName} (${newUser.userId})`,
    balanceAfter: inviter.credits,
  });

  // 2. Award New User 500 Credits
  newUser.credits = (typeof newUser.credits === 'number' ? newUser.credits : 0) + REFERRAL_CREDIT_BONUS;
  newUser.referredBy = inviter.referralCode;
  if (!Array.isArray(newUser.creditTransactions)) newUser.creditTransactions = [];
  newUser.creditTransactions.unshift({
    id: 'tx_ref_new_' + Math.random().toString(36).substring(2, 9),
    date: new Date().toISOString(),
    amount: REFERRAL_CREDIT_BONUS,
    type: 'REFERRED_WELCOME_BONUS',
    description: `+500 Referral Welcome Bonus using code ${cleanCode} from ${inviter.fullName}`,
    balanceAfter: newUser.credits,
  });

  saveUsersToStorage(users);

  return {
    success: true,
    bonusGranted: REFERRAL_CREDIT_BONUS,
    inviterName: inviter.fullName,
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
  return { success: true, user: matched };
}

/**
 * Google Sign-In helper: Authenticates or creates account via Google email.
 */
export function authenticateGoogleUser(googleData: {
  email: string;
  name?: string;
  picture?: string;
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

  saveActiveUserIdToStorage(matched.id);
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
  if (newUser.referralCodeInput && newUser.referralCodeInput.trim()) {
    applyReferralReward(userProfile.id, newUser.referralCodeInput.trim());
    // reload updated profile with credits
    const reloaded = loadUsersFromStorage().find((u) => u.id === userProfile.id);
    if (reloaded) return { success: true, user: reloaded };
  }

  return { success: true, user: userProfile };
}


/**
 * Loads saved companies strictly for a specific User ID
 */
export function loadCompaniesForUser(userId: string): Company[] {
  if (!userId) return [];
  try {
    const userKey = `ca_user_${userId}_companies_v2`;
    const raw = localStorage.getItem(userKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    return [];
  } catch (error) {
    console.error(`Failed to load companies for user "${userId}":`, error);
    return [];
  }
}

/**
 * Saves companies array strictly for a specific User ID
 */
export function saveCompaniesForUser(userId: string, companies: Company[]): boolean {
  if (!userId) return false;
  try {
    const userKey = `ca_user_${userId}_companies_v2`;
    localStorage.setItem(userKey, JSON.stringify(companies));
    return true;
  } catch (error) {
    console.error(`Failed to save companies for user "${userId}":`, error);
    return false;
  }
}

/**
 * Saves all companies array to browser LocalStorage with automatic redundancy
 * and quota protection so created companies are never lost.
 */
export function saveCompaniesToStorage(companies: Company[]): boolean {
  try {
    if (!Array.isArray(companies)) return false;

    // 1. Primary Save: Complete serialized array
    const serialized = JSON.stringify(companies);
    try {
      localStorage.setItem(STORAGE_KEY_COMPANIES, serialized);
    } catch (quotaError) {
      console.warn('Primary company storage hit quota limits, attempting compact save:', quotaError);
      // Compact fallback: trim redundant large fields while preserving all configs, mappings, and totals
      const compacted = companies.map((c) => ({
        ...c,
        rawRows: (c.rawRows || []).slice(0, 500),
        pyRawRows: (c.pyRawRows || []).slice(0, 500),
      }));
      localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(compacted));
    }

    // 2. Secondary Redundant Save: Individual company records for fail-safe recovery
    companies.forEach((comp) => {
      if (comp?.id) {
        try {
          localStorage.setItem(`ca_comp_entry_${comp.id}`, JSON.stringify(comp));
        } catch (e) {
          // ignore individual item quota warnings
        }
      }
    });

    return true;
  } catch (error) {
    console.error('Critical failure in saveCompaniesToStorage:', error);
    return false;
  }
}

/**
 * Loads all saved companies from browser LocalStorage.
 * Includes multiple fail-safe fallback recovery layers so created companies are never lost.
 */
export function loadCompaniesFromStorage(): Company[] {
  try {
    // Attempt 1: Standard primary storage key
    const raw = localStorage.getItem(STORAGE_KEY_COMPANIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Attempt 2: Recover from individual company backup entries (ca_comp_entry_*)
    const recovered: Company[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ca_comp_entry_')) {
        const itemRaw = localStorage.getItem(key);
        if (itemRaw) {
          try {
            const comp = JSON.parse(itemRaw);
            if (comp && comp.id && comp.config && !recovered.some((r) => r.id === comp.id)) {
              recovered.push(comp);
            }
          } catch (e) {
            // ignore corrupted item
          }
        }
      }
    }

    if (recovered.length > 0) {
      console.info(`Recovered ${recovered.length} companies from individual storage records.`);
      // Resave to primary storage key for consistency
      saveCompaniesToStorage(recovered);
      return recovered;
    }

    // Attempt 3: User-scoped legacy keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ca_user_') && key.endsWith('_companies_v2')) {
        const userRaw = localStorage.getItem(key);
        if (userRaw) {
          try {
            const parsed = JSON.parse(userRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              saveCompaniesToStorage(parsed);
              return parsed;
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }

    return [];
  } catch (error) {
    console.error('Failed to load companies from LocalStorage:', error);
    return [];
  }
}

/**
 * Saves current active company ID to LocalStorage
 */
export function saveActiveCompanyIdToStorage(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
  } catch (error) {
    console.error('Failed to save active company ID to LocalStorage:', error);
  }
}

/**
 * Loads current active company ID from LocalStorage
 */
export function loadActiveCompanyIdFromStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
  } catch (error) {
    console.error('Failed to load active company ID from LocalStorage:', error);
    return null;
  }
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
