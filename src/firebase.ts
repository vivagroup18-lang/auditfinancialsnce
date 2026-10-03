import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

import firebaseConfigData from '../firebase-applet-config.json';

// Web app Firebase configuration from firebase-applet-config.json
export const firebaseConfig = firebaseConfigData;

// Initialize Firebase App safely (singleton)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

// Firestore Error Handler Types & Helper conforming to Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test for Firestore
if (typeof window !== 'undefined') {
  import('firebase/firestore').then(({ doc, getDocFromServer }) => {
    getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration.');
      }
    });
  }).catch(() => {});
}

// Initialize Firebase Analytics
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.warn('[Firebase Analytics] Initialization notice:', e);
      }
    }
  }).catch(() => {});
}

// Standard Identity Google Provider (No intrusive Gmail/Drive permissions needed for login)
export const standardGoogleProvider = new GoogleAuthProvider();
standardGoogleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Configure Google Auth Provider with Google Drive (file-scoped) and Gmail send
export const googleProvider = new GoogleAuthProvider();
// Google Drive - Only access files created or opened by this application (Safe, does not require restricted security assessment)
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
// Gmail - Sending audit reports and client transmittals directly from the app
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');

googleProvider.setCustomParameters({
  prompt: 'select_account',
});

const SESSION_TOKEN_KEY = 'ca_google_drive_token_session';
const SESSION_TOKEN_EXPIRY_KEY = 'ca_google_drive_token_expiry';
const TOKEN_TTL_MS = 50 * 60 * 1000; // 50 minutes safe TTL for 1-hour Google OAuth tokens

function readValidSessionToken(): string | null {
  try {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const expiryStr = sessionStorage.getItem(SESSION_TOKEN_EXPIRY_KEY);
    if (!token || !expiryStr) {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_EXPIRY_KEY);
      return null;
    }
    const expiry = Number(expiryStr);
    if (!Number.isFinite(expiry) || Date.now() > expiry) {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_EXPIRY_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function writeSessionToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      sessionStorage.setItem(SESSION_TOKEN_EXPIRY_KEY, String(Date.now() + TOKEN_TTL_MS));
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_EXPIRY_KEY);
    }
  } catch {}
}

// In-session token cache (persists during active browser tab while valid, cleared on expiry/logout)
let cachedAccessToken: string | null = readValidSessionToken();
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const validToken = readValidSessionToken();
      cachedAccessToken = validToken;
      if (validToken) {
        if (onAuthSuccess) onAuthSuccess(user, validToken);
      } else if (!isSigningIn) {
        // User is signed in with Firebase, but Drive token is not yet connected or has expired
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      writeSessionToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const getReadableAuthErrorMessage = (err: any): { message: string; isDomainError: boolean; domain?: string } => {
  if (!err) return { message: 'Authentication failed.', isDomainError: false };
  const code = err.code || '';
  const msg = String(err.message || err);
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';

  if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
    return {
      message: `Domain '${currentDomain}' is not authorized for Google Sign-In. Add '${currentDomain}' to Authorized Domains in Firebase Console (Authentication > Settings > Authorized domains) and GCP OAuth Client settings.`,
      isDomainError: true,
      domain: currentDomain,
    };
  }
  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return {
      message: `Google Sign-In popup was blocked by your browser. Please allow popups for ${currentDomain} and try again.`,
      isDomainError: false,
    };
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || msg.includes('popup-closed-by-user')) {
    return {
      message: 'Google Sign-In window was closed before completion. Please try again.',
      isDomainError: false,
    };
  }
  if (code === 'auth/operation-not-allowed') {
    return {
      message: 'Google Sign-In provider is not enabled in Firebase Console. Please enable Google under Authentication > Sign-in method.',
      isDomainError: false,
    };
  }
  return {
    message: err.message || 'Google authentication failed. Please check your credentials.',
    isDomainError: false,
  };
};

export const isPopupBlockedOrUnauthorized = (err: any): boolean => {
  if (!err) return false;
  const code = err.code || '';
  const msg = String(err.message || err);
  return (
    code === 'auth/unauthorized-domain' ||
    code === 'auth/popup-blocked' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/operation-not-allowed' ||
    code === 'auth/configuration-not-found' ||
    msg.includes('unauthorized-domain') ||
    msg.includes('popup-blocked') ||
    msg.includes('popup-closed-by-user') ||
    msg.includes('cancelled-popup-request')
  );
};

/**
 * Standard 1-click Google Sign-In for User Authentication (lightweight & safe)
 */
export const googleSignInStandard = async (): Promise<{ user: User; accessToken?: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, standardGoogleProvider);
    // Do not overwrite Drive-scoped token with a standard identity-only token
    const existingValidDriveToken = readValidSessionToken();
    return { user: result.user, accessToken: existingValidDriveToken || undefined };
  } catch (error: any) {
    const parsed = getReadableAuthErrorMessage(error);
    const enhancedError = new Error(parsed.message);
    (enhancedError as any).code = error.code;
    (enhancedError as any).isDomainError = parsed.isDomainError;
    (enhancedError as any).domain = parsed.domain;
    console.warn('[Firebase Auth] Google Sign In Notice:', error);
    throw enhancedError;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Full Workspace Google Sign-In with Gmail & Drive scopes
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      writeSessionToken(credential.accessToken);
    }
    if (!cachedAccessToken) {
      throw new Error('Google Workspace authorization did not return an access token. Please grant the requested permissions.');
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const parsed = getReadableAuthErrorMessage(error);
    const enhancedError = new Error(parsed.message);
    (enhancedError as any).code = error.code;
    (enhancedError as any).isDomainError = parsed.isDomainError;
    (enhancedError as any).domain = parsed.domain;
    console.warn('[Firebase Auth] Google Workspace Sign-In Notice:', error);
    throw enhancedError;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  const valid = readValidSessionToken();
  cachedAccessToken = valid;
  return valid;
};

export const setAccessTokenInMemory = (token: string | null) => {
  cachedAccessToken = token;
  writeSessionToken(token);
};

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  writeSessionToken(null);
};
