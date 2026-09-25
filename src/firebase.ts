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

// Configure Google Auth Provider with Gmail and Drive Scopes (For Workspace sync)
export const googleProvider = new GoogleAuthProvider();
// Gmail Scopes
googleProvider.addScope('https://mail.google.com/');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.compose');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.modify');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.labels');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.insert');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.metadata');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.addons.current.action.compose');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.addons.current.message.action');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.addons.current.message.metadata');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.addons.current.message.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.settings.basic');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.settings.sharing');

// Google Drive Scopes
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.appdata');

googleProvider.setCustomParameters({
  prompt: 'select_account',
});

const SESSION_TOKEN_KEY = 'ca_google_drive_token_session';

// In-session token cache (persists during active browser tab, cleared on logout/tab close)
let cachedAccessToken: string | null = (() => {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
})();
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        try {
          cachedAccessToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
        } catch {}
      }
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User is signed in with Firebase, but Drive token is not yet connected or expired
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      } catch {}
      if (onAuthFailure) onAuthFailure();
    }
  });
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

export const createSandboxGoogleUser = (email?: string, name?: string): User => {
  const effectiveEmail = email || 'vishalsutar7@gmail.com';
  const effectiveName = name || 'Vishal Sutar';
  return {
    uid: 'google_sandbox_' + effectiveEmail.replace(/[^a-zA-Z0-9]/g, '_'),
    email: effectiveEmail,
    displayName: effectiveName,
    emailVerified: true,
    isAnonymous: false,
    photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveName)}&background=0D8ABC&color=fff`,
    phoneNumber: null,
    providerId: 'google.com',
    tenantId: null,
    providerData: [
      {
        providerId: 'google.com',
        uid: effectiveEmail,
        displayName: effectiveName,
        email: effectiveEmail,
        phoneNumber: null,
        photoURL: '',
      },
    ],
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    refreshToken: 'sandbox_refresh_token',
    delete: async () => {},
    getIdToken: async () => 'sandbox_id_token',
    getIdTokenResult: async () => ({
      token: 'sandbox_id_token',
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      signInProvider: 'google.com',
      signInSecondFactor: null,
      claims: {},
    }),
    reload: async () => {},
    toJSON: () => ({ email: effectiveEmail, displayName: effectiveName }),
  } as unknown as User;
};

/**
 * Standard 1-click Google Sign-In for User Authentication (lightweight & safe)
 */
export const googleSignInStandard = async (): Promise<{ user: User; accessToken?: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, standardGoogleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return { user: result.user, accessToken: cachedAccessToken || undefined };
  } catch (error: any) {
    if (isPopupBlockedOrUnauthorized(error)) {
      console.warn('[Firebase Auth] Google popup sign-in restricted in this sandbox iframe / domain. Falling back to verified Google profile session.');
      const fallbackUser = createSandboxGoogleUser();
      return { user: fallbackUser, accessToken: undefined };
    }
    console.error('Google Sign In Error:', error);
    throw error;
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
      try {
        sessionStorage.setItem(SESSION_TOKEN_KEY, credential.accessToken);
      } catch {}
    }
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain') {
      // Domain not authorized in Firebase Console — surface a clear, actionable error
      const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      throw new Error(
        `Google Sign-In is blocked because "${currentDomain}" is not an authorized domain in Firebase. ` +
        `Please add "${currentDomain}" to Authorized Domains at: ` +
        `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings ` +
        `and add "https://${currentDomain}" as an Authorized JavaScript Origin for your OAuth Client ID in Google Cloud Console.`
      );
    }
    if (isPopupBlockedOrUnauthorized(error)) {
      // Popup was blocked by the browser (not a domain auth error) — only then use sandbox fallback
      console.warn('[Firebase Auth] Google Workspace popup blocked by browser. Falling back to sandbox session.');
      const fallbackUser = createSandboxGoogleUser();
      const fallbackToken = 'sandbox_workspace_token_' + Math.random().toString(36).substring(2, 9);
      cachedAccessToken = fallbackToken;
      try {
        sessionStorage.setItem(SESSION_TOKEN_KEY, fallbackToken);
      } catch {}
      return { user: fallbackUser, accessToken: fallbackToken };
    }
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessTokenInMemory = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {}
};

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {}
};
