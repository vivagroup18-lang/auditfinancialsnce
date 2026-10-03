import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { REFERRAL_CREDIT_BONUS } from '../data/subscriptionPlans';
import { saveUsersToStorage, loadUsersFromStorage, normalizeUserProfile } from '../utils/storageManager';

export interface CloudReferralProfile {
  referralCode: string;
  userId: string;
  fullName: string;
  email: string;
  userProfileId: string;
  updatedAt: string;
}

export interface CloudReferralRewardEvent {
  id?: string;
  inviterReferralCode: string;
  inviterUserId?: string;
  inviterEmail?: string;
  inviterName?: string;
  refereeUserId: string;
  refereeEmail: string;
  refereeName: string;
  bonus: number;
  status: 'pending' | 'claimed';
  createdAt: string;
  claimedAt?: string;
}

const STORAGE_PENDING_QUEUE = 'ca_offline_pending_referral_events';

/**
 * Builds a deterministic referral reward event ID for an (inviter, referee) pair
 * so repeated syncs never duplicate rewards.
 */
export function buildReferralEventId(
  inviterCodeOrHandle: string,
  refereeEmailOrId: string
): string {
  const cleanInviter = (inviterCodeOrHandle || 'REF')
    .trim()
    .toUpperCase()
    .replace(/^@/, '')
    .replace(/[^A-Z0-9_-]/g, '_');
  const cleanReferee = (refereeEmailOrId || 'USER')
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9_-]/g, '_');
  return `ref_evt_${cleanInviter}_${cleanReferee}`;
}

/**
 * Publishes/updates a user's referral identity in BOTH Firestore `referral_directory`
 * AND the server-side `/api/referrals/sync` directory.
 */
export async function syncUserReferralToCloud(user: UserProfile): Promise<boolean> {
  if (!user || !user.referralCode) return false;

  const cleanCode = user.referralCode.trim().toUpperCase();
  const cleanUserId = (user.userId || '').trim().toLowerCase().replace(/^@/, '');
  const cleanEmail = (user.email || '').trim().toLowerCase();

  const payload: CloudReferralProfile = {
    referralCode: cleanCode,
    userId: cleanUserId,
    fullName: user.fullName || 'Chartered Accountant',
    email: cleanEmail,
    userProfileId: user.id,
    updatedAt: new Date().toISOString(),
  };

  let syncedAny = false;

  // 1. Server-side referral directory sync
  try {
    const res = await fetch('/api/referrals/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) syncedAny = true;
  } catch {
    // ignore network error
  }

  // 2. Firestore referral_directory sync
  try {
    const codeDocRef = doc(db, 'referral_directory', `code_${cleanCode}`);
    await setDoc(codeDocRef, payload, { merge: true });

    if (cleanUserId && cleanUserId.length >= 2) {
      const userDocRef = doc(db, 'referral_directory', `user_${cleanUserId}`);
      await setDoc(userDocRef, payload, { merge: true });
    }

    if (cleanEmail && cleanEmail.includes('@')) {
      const emailKey = cleanEmail.replace(/[^a-z0-9_]/g, '_');
      const emailDocRef = doc(db, 'referral_directory', `email_${emailKey}`);
      await setDoc(emailDocRef, payload, { merge: true });
    }

    syncedAny = true;
  } catch (error) {
    console.warn('Could not sync user referral identity to Firestore:', error);
  }

  return syncedAny;
}

/**
 * Searches for a referrer in Firestore and Server API by Referral Code, User ID Handle, Email, or Code Prefix.
 */
export async function lookupReferrerInCloud(input: string): Promise<CloudReferralProfile | null> {
  const clean = (input || '').trim();
  if (!clean) return null;

  const cleanNoAt = clean.replace(/^[@#]/, '').trim();
  const cleanCode = cleanNoAt.toUpperCase();
  const cleanUser = cleanNoAt.toLowerCase();
  const cleanEmail = cleanNoAt.toLowerCase();
  const codePrefix = cleanCode.replace(/^REF-/, '').replace(/[0-9]+$/, '');

  // 1. Try server-side lookup first (fast & auth-independent)
  try {
    const res = await fetch(`/api/referrals/lookup?q=${encodeURIComponent(cleanNoAt)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.found && data.profile) {
        return data.profile as CloudReferralProfile;
      }
    }
  } catch {
    // fallback to Firestore
  }

  // 2. Query Firestore referral_directory
  try {
    const byCodeRef = doc(db, 'referral_directory', `code_${cleanCode}`);
    const codeSnap = await getDoc(byCodeRef);
    if (codeSnap.exists()) {
      return codeSnap.data() as CloudReferralProfile;
    }

    const byUserRef = doc(db, 'referral_directory', `user_${cleanUser}`);
    const userSnap = await getDoc(byUserRef);
    if (userSnap.exists()) {
      return userSnap.data() as CloudReferralProfile;
    }

    if (cleanEmail.includes('@')) {
      const emailKey = cleanEmail.replace(/[^a-z0-9_]/g, '_');
      const byEmailRef = doc(db, 'referral_directory', `email_${emailKey}`);
      const emailSnap = await getDoc(byEmailRef);
      if (emailSnap.exists()) {
        return emailSnap.data() as CloudReferralProfile;
      }
    }

    const dirRef = collection(db, 'referral_directory');
    const allSnap = await getDocs(dirRef);
    for (const d of allSnap.docs) {
      const p = d.data() as CloudReferralProfile;
      if (!p) continue;
      if ((p.referralCode || '').toUpperCase() === cleanCode) return p;
      if ((p.userId || '').toLowerCase() === cleanUser) return p;
      if ((p.email || '').toLowerCase() === cleanEmail) return p;
      if (codePrefix.length >= 4) {
        const pPrefix = (p.referralCode || '').toUpperCase().replace(/^REF-/, '').replace(/[0-9]+$/, '');
        const uPrefix = (p.userId || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (pPrefix === codePrefix || uPrefix === codePrefix) {
          return p;
        }
      }
    }
  } catch (error) {
    console.warn('Firestore cloud referral lookup error:', error);
  }

  return null;
}

/**
 * Records a pending reward event in BOTH Firestore `referral_events` AND `/api/referrals/record-event`.
 * Uses a deterministic event ID per (inviter, referee) pair so it never duplicates.
 */
export async function recordReferralRewardEvent(
  inviter: {
    referralCode: string;
    userId?: string;
    email?: string;
    fullName?: string;
  },
  referee: {
    userId: string;
    email: string;
    fullName?: string;
  }
): Promise<boolean> {
  const cleanInviterCode = (inviter.referralCode || '').trim().toUpperCase();
  if (!cleanInviterCode) return false;

  const refereeIdentifier = referee.email || referee.userId;
  if (!refereeIdentifier) return false;

  const eventId = buildReferralEventId(cleanInviterCode, refereeIdentifier);

  const eventPayload: CloudReferralRewardEvent = {
    id: eventId,
    inviterReferralCode: cleanInviterCode,
    inviterUserId: (inviter.userId || '').trim().toLowerCase().replace(/^@/, ''),
    inviterEmail: (inviter.email || '').trim().toLowerCase(),
    inviterName: inviter.fullName || 'Chartered Accountant',
    refereeUserId: referee.userId,
    refereeEmail: (referee.email || '').trim().toLowerCase(),
    refereeName: referee.fullName || referee.userId || 'Colleague',
    bonus: REFERRAL_CREDIT_BONUS,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  let savedToAny = false;

  // 1. Record on Server API
  try {
    const res = await fetch('/api/referrals/record-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload),
    });
    if (res.ok) {
      savedToAny = true;
    }
  } catch {
    // ignore
  }

  // 2. Record in Firestore `referral_events` (do not overwrite if already 'claimed')
  try {
    const eventRef = doc(db, 'referral_events', eventId);
    const existingSnap = await getDoc(eventRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as CloudReferralRewardEvent;
      if (existingData.status === 'claimed') {
        return true;
      }
    }
    await setDoc(eventRef, eventPayload, { merge: true });
    savedToAny = true;
  } catch (error) {
    console.warn('Could not record referral event in Firestore:', error);
  }

  if (!savedToAny) {
    try {
      const raw = localStorage.getItem(STORAGE_PENDING_QUEUE);
      const queue: CloudReferralRewardEvent[] = raw ? JSON.parse(raw) : [];
      if (!queue.some((q) => q.id === eventId)) {
        queue.push(eventPayload);
        localStorage.setItem(STORAGE_PENDING_QUEUE, JSON.stringify(queue));
      }
    } catch {}
  }

  return savedToAny;
}

/**
 * Ensures that if a user has `referredBy` set on their profile (from logging in with a referral link),
 * the corresponding reward event for the sender (inviter) is published to the cloud & server.
 */
export async function ensureReferredUserEventSynced(user: UserProfile): Promise<void> {
  if (!user || !user.referredBy || user.id.startsWith('guest_ca')) return;

  try {
    const rawRef = user.referredBy.trim();
    if (!rawRef) return;

    const cloudInviter = await lookupReferrerInCloud(rawRef);
    const cleanCode = rawRef.toUpperCase().startsWith('REF-')
      ? rawRef.toUpperCase()
      : cloudInviter?.referralCode || rawRef.toUpperCase();

    await recordReferralRewardEvent(
      {
        referralCode: cleanCode,
        userId: cloudInviter?.userId || rawRef.toLowerCase().replace(/^@/, ''),
        email: cloudInviter?.email || (rawRef.includes('@') ? rawRef.toLowerCase() : ''),
        fullName: cloudInviter?.fullName || 'Chartered Accountant',
      },
      {
        userId: user.userId || user.id,
        email: user.email || '',
        fullName: user.fullName,
      }
    );
  } catch (err) {
    console.warn('ensureReferredUserEventSynced notice:', err);
  }
}

/**
 * Flushes any locally queued offline referral events to Firestore & Server once online.
 */
export async function flushOfflineReferralEvents(): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_PENDING_QUEUE);
    if (!raw) return;
    const queue: CloudReferralRewardEvent[] = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return;

    const remaining: CloudReferralRewardEvent[] = [];
    for (const evt of queue) {
      const ok = await recordReferralRewardEvent(
        {
          referralCode: evt.inviterReferralCode,
          userId: evt.inviterUserId,
          email: evt.inviterEmail,
          fullName: evt.inviterName,
        },
        {
          userId: evt.refereeUserId,
          email: evt.refereeEmail,
          fullName: evt.refereeName,
        }
      );
      if (!ok) {
        remaining.push(evt);
      }
    }

    if (remaining.length === 0) {
      localStorage.removeItem(STORAGE_PENDING_QUEUE);
    } else {
      localStorage.setItem(STORAGE_PENDING_QUEUE, JSON.stringify(remaining));
    }
  } catch {}
}

/**
 * Helper to check if a referral reward event belongs to the given inviter user profile.
 * Matches by exact Referral Code, User ID handle, Email, or 6-char User Handle Prefix (e.g. REF-VIVAGR...).
 */
export function doesReferralEventMatchInviter(
  evt: CloudReferralRewardEvent,
  currentUser: UserProfile
): boolean {
  if (!evt || !currentUser) return false;

  const userCode = (currentUser.referralCode || '').trim().toUpperCase();
  const userHandle = (currentUser.userId || '').trim().toLowerCase().replace(/^@/, '');
  const userEmail = (currentUser.email || '').trim().toLowerCase();
  const emailHandle = userEmail.includes('@') ? userEmail.split('@')[0].toLowerCase() : '';

  // Never match if the referee is the same user as currentUser (prevent self-referral)
  const refEmail = (evt.refereeEmail || '').trim().toLowerCase();
  const refUser = (evt.refereeUserId || '').trim().toLowerCase().replace(/^@/, '');
  if (userEmail && refEmail && userEmail !== 'guest@auditfinancials.local' && userEmail === refEmail) {
    return false;
  }
  if (userHandle && refUser && userHandle !== 'guest_ca' && userHandle === refUser) {
    return false;
  }

  const evtCode = (evt.inviterReferralCode || '').trim().toUpperCase();
  const evtUser = (evt.inviterUserId || '').trim().toLowerCase().replace(/^@/, '');
  const evtEmail = (evt.inviterEmail || '').trim().toLowerCase();

  if (userCode && evtCode === userCode) return true;
  if (userHandle && (evtUser === userHandle || evtCode === userHandle.toUpperCase())) return true;
  if (emailHandle && (evtUser === emailHandle || evtCode === emailHandle.toUpperCase())) return true;
  if (userEmail && (evtEmail === userEmail || evtCode === userEmail.toUpperCase())) return true;

  // Prefix matching for codes generated as REF-<6_CHAR_PREFIX><3_DIGITS>
  const evtCodePrefix = evtCode.replace(/^REF-/, '').replace(/[0-9]+$/, '');
  const handlePrefix = (userHandle || emailHandle)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
  const userCodePrefix = userCode.replace(/^REF-/, '').replace(/[0-9]+$/, '');

  if (evtCodePrefix.length >= 4) {
    if (handlePrefix.length >= 4 && evtCodePrefix === handlePrefix) return true;
    if (userCodePrefix.length >= 4 && evtCodePrefix === userCodePrefix) return true;
  }

  return false;
}

let isClaimingInProgress = false;

/**
 * Claims any pending referral reward events for the active user from BOTH Firestore and Server API.
 * Awards +500 credits per referee, adds transaction records, and updates storage & Firestore.
 */
export async function claimPendingReferralRewards(currentUser: UserProfile): Promise<{
  claimedCount: number;
  totalAwarded: number;
  refereeNames: string[];
  updatedUser?: UserProfile;
}> {
  if (!currentUser || !currentUser.referralCode || isClaimingInProgress) {
    return { claimedCount: 0, totalAwarded: 0, refereeNames: [] };
  }

  isClaimingInProgress = true;

  try {
    // 1. Flush any offline events and ensure currentUser's own referredBy event (if any) is synced
    await flushOfflineReferralEvents();
    if (currentUser.referredBy) {
      await ensureReferredUserEventSynced(currentUser);
    }

    const matchedMap = new Map<string, { docId: string; data: CloudReferralRewardEvent; fromFirestore?: boolean }>();

    // 2. Query Server API `/api/referrals/claim`
    try {
      const res = await fetch('/api/referrals/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode: currentUser.referralCode,
          userId: currentUser.userId,
          email: currentUser.email,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        if (Array.isArray(body?.events)) {
          for (const evt of body.events) {
            const docId = evt.id || buildReferralEventId(evt.inviterReferralCode, evt.refereeEmail || evt.refereeUserId);
            matchedMap.set(docId, { docId, data: evt, fromFirestore: false });
          }
        }
      }
    } catch {
      // ignore server claim error
    }

    // 3. Query Firestore `referral_events` where status == 'pending'
    try {
      const eventsRef = collection(db, 'referral_events');
      const qPending = query(eventsRef, where('status', '==', 'pending'));
      const snapPending = await getDocs(qPending);

      snapPending.forEach((d) => {
        const data = d.data() as CloudReferralRewardEvent;
        if (doesReferralEventMatchInviter(data, currentUser)) {
          matchedMap.set(d.id, { docId: d.id, data, fromFirestore: true });
        }
      });
    } catch (e) {
      console.warn('Error querying pending referral events in Firestore:', e);
    }

    if (matchedMap.size === 0) {
      return { claimedCount: 0, totalAwarded: 0, refereeNames: [] };
    }

    // 4. Load users from storage and locate the sender's profile
    const allUsers = loadUsersFromStorage();
    let userIndex = allUsers.findIndex(
      (u) =>
        u.id === currentUser.id ||
        (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (u.userId && currentUser.userId && u.userId.toLowerCase() === currentUser.userId.toLowerCase())
    );

    let active: UserProfile;
    if (userIndex >= 0) {
      active = normalizeUserProfile({ ...allUsers[userIndex], ...currentUser, credits: allUsers[userIndex].credits });
    } else {
      active = normalizeUserProfile(currentUser);
      allUsers.push(active);
      userIndex = allUsers.length - 1;
    }

    if (!Array.isArray(active.creditTransactions)) {
      active.creditTransactions = [];
    }

    let claimedCount = 0;
    let totalAwarded = 0;
    const refereeNames: string[] = [];

    for (const item of matchedMap.values()) {
      const evt = item.data;
      const bonus = typeof evt.bonus === 'number' ? evt.bonus : REFERRAL_CREDIT_BONUS;
      const refEmail = (evt.refereeEmail || '').trim().toLowerCase();
      const refUserId = (evt.refereeUserId || '').trim().toLowerCase();

      // Check if this specific referee was ALREADY credited in active.creditTransactions (e.g. same-browser instant credit)
      const alreadyCreditedLocally = active.creditTransactions.some((tx) => {
        if (tx.type !== 'REFERRAL_REWARD') return false;
        if (tx.id === `tx_${item.docId}`) return false; // Wait: if tx.id === `tx_${item.docId}`, it WAS credited!
        const descLower = (tx.description || '').toLowerCase();
        if (refEmail && descLower.includes(refEmail)) return true;
        if (refUserId && descLower.includes(`(${refUserId})`)) return true;
        return false;
      }) || active.creditTransactions.some((tx) => tx.id === `tx_${item.docId}`);

      if (!alreadyCreditedLocally) {
        active.credits = (typeof active.credits === 'number' ? active.credits : 0) + bonus;
        active.referralsCount = (active.referralsCount || 0) + 1;
        active.totalReferralCredits = (active.totalReferralCredits || 0) + bonus;

        active.creditTransactions.unshift({
          id: `tx_${item.docId}`,
          date: new Date().toISOString(),
          amount: bonus,
          type: 'REFERRAL_REWARD',
          description: `+${bonus} Credits! Successfully referred ${evt.refereeName || 'Colleague'} (${evt.refereeEmail || evt.refereeUserId})`,
          balanceAfter: active.credits,
        });

        claimedCount++;
        totalAwarded += bonus;
        refereeNames.push(evt.refereeName || evt.refereeEmail || evt.refereeUserId || 'Colleague');
      }

      // Mark Firestore document status as 'claimed' so it isn't processed again
      try {
        const docRef = doc(db, 'referral_events', item.docId);
        await updateDoc(docRef, {
          status: 'claimed',
          claimedAt: new Date().toISOString(),
        });
      } catch {
        // Document might only exist on server or already updated
      }
    }

    if (claimedCount > 0) {
      allUsers[userIndex] = active;
      saveUsersToStorage(allUsers);
    }

    return {
      claimedCount,
      totalAwarded,
      refereeNames,
      updatedUser: claimedCount > 0 ? active : undefined,
    };
  } catch (error) {
    console.warn('Error claiming pending referral rewards:', error);
    return { claimedCount: 0, totalAwarded: 0, refereeNames: [] };
  } finally {
    isClaimingInProgress = false;
  }
}

/**
 * Subscribes in real-time to Firestore `referral_events` so that when a referred user logs in
 * with the sender's referral link, the sender receives their +500 credits immediately without refreshing.
 */
export function subscribeToReferralRewards(
  currentUser: UserProfile,
  onClaimed: (result: {
    claimedCount: number;
    totalAwarded: number;
    refereeNames: string[];
    updatedUser: UserProfile;
  }) => void
): () => void {
  if (!currentUser || !currentUser.referralCode) {
    return () => {};
  }

  let isUnsubscribed = false;

  const triggerCheck = () => {
    if (isUnsubscribed) return;
    claimPendingReferralRewards(currentUser)
      .then((res) => {
        if (!isUnsubscribed && res.claimedCount > 0 && res.updatedUser) {
          onClaimed({
            claimedCount: res.claimedCount,
            totalAwarded: res.totalAwarded,
            refereeNames: res.refereeNames,
            updatedUser: res.updatedUser,
          });
        }
      })
      .catch(() => {});
  };

  // Real-time Firestore listener on pending referral events
  let unsubscribeFirestore: (() => void) | null = null;
  try {
    const eventsRef = collection(db, 'referral_events');
    const qPending = query(eventsRef, where('status', '==', 'pending'));
    unsubscribeFirestore = onSnapshot(
      qPending,
      (snapshot) => {
        if (isUnsubscribed) return;
        let hasMatch = false;
        snapshot.forEach((d) => {
          const data = d.data() as CloudReferralRewardEvent;
          if (doesReferralEventMatchInviter(data, currentUser)) {
            hasMatch = true;
          }
        });
        if (hasMatch) {
          triggerCheck();
        }
      },
      () => {
        // Ignore snapshot errors
      }
    );
  } catch {
    // Ignore setup errors
  }

  // Also poll every 12 seconds as a fallback for server-side events
  const intervalId = setInterval(triggerCheck, 12000);

  return () => {
    isUnsubscribed = true;
    if (unsubscribeFirestore) unsubscribeFirestore();
    clearInterval(intervalId);
  };
}
