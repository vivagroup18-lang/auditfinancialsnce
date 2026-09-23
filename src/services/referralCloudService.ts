import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { REFERRAL_CREDIT_BONUS } from '../data/subscriptionPlans';
import { saveUsersToStorage, loadUsersFromStorage } from '../utils/storageManager';

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
 * Publishes/updates a user's referral identity in Firestore referral_directory.
 * Creates direct lookup keys by:
 * 1. Referral Code (e.g., code_REF-RAJESH24)
 * 2. User ID / Handle (e.g., user_ca_rajesh)
 * 3. Registered Email (e.g., email_rajesh_gmail_com)
 */
export async function syncUserReferralToCloud(user: UserProfile): Promise<boolean> {
  if (!user || !user.referralCode) return false;

  try {
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

    // Primary document by referral code
    const codeDocRef = doc(db, 'referral_directory', `code_${cleanCode}`);
    await setDoc(codeDocRef, payload, { merge: true });

    // Lookup alias by User ID Handle
    if (cleanUserId && cleanUserId.length >= 2) {
      const userDocRef = doc(db, 'referral_directory', `user_${cleanUserId}`);
      await setDoc(userDocRef, payload, { merge: true });
    }

    // Lookup alias by Email
    if (cleanEmail && cleanEmail.includes('@')) {
      const emailKey = cleanEmail.replace(/[^a-z0-9_]/g, '_');
      const emailDocRef = doc(db, 'referral_directory', `email_${emailKey}`);
      await setDoc(emailDocRef, payload, { merge: true });
    }

    return true;
  } catch (error) {
    console.warn('Could not sync user referral identity to Firestore (offline or unauthenticated):', error);
    return false;
  }
}

/**
 * Searches for a referrer in Firestore by Referral Code, User ID Handle, or Email.
 */
export async function lookupReferrerInCloud(input: string): Promise<CloudReferralProfile | null> {
  const clean = input.trim();
  if (!clean) return null;

  const cleanNoAt = clean.replace(/^[@#]/, '').trim();
  const cleanCode = cleanNoAt.toUpperCase();
  const cleanUser = cleanNoAt.toLowerCase();
  const cleanEmail = cleanNoAt.toLowerCase();

  try {
    // 1. Direct getDoc by code
    const byCodeRef = doc(db, 'referral_directory', `code_${cleanCode}`);
    const codeSnap = await getDoc(byCodeRef);
    if (codeSnap.exists()) {
      return codeSnap.data() as CloudReferralProfile;
    }

    // 2. Direct getDoc by user handle
    const byUserRef = doc(db, 'referral_directory', `user_${cleanUser}`);
    const userSnap = await getDoc(byUserRef);
    if (userSnap.exists()) {
      return userSnap.data() as CloudReferralProfile;
    }

    // 3. Direct getDoc by sanitized email
    if (cleanEmail.includes('@')) {
      const emailKey = cleanEmail.replace(/[^a-z0-9_]/g, '_');
      const byEmailRef = doc(db, 'referral_directory', `email_${emailKey}`);
      const emailSnap = await getDoc(byEmailRef);
      if (emailSnap.exists()) {
        return emailSnap.data() as CloudReferralProfile;
      }
    }

    // 4. Fallback Firestore collection query by fields (in case key format differs)
    const dirRef = collection(db, 'referral_directory');

    // Query by referralCode
    const qCode = query(dirRef, where('referralCode', '==', cleanCode));
    const snapCode = await getDocs(qCode);
    if (!snapCode.empty) {
      return snapCode.docs[0].data() as CloudReferralProfile;
    }

    // Query by userId
    const qUser = query(dirRef, where('userId', '==', cleanUser));
    const snapUser = await getDocs(qUser);
    if (!snapUser.empty) {
      return snapUser.docs[0].data() as CloudReferralProfile;
    }

    // Query by email
    if (cleanEmail.includes('@')) {
      const qEmail = query(dirRef, where('email', '==', cleanEmail));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        return snapEmail.docs[0].data() as CloudReferralProfile;
      }
    }

    return null;
  } catch (error) {
    console.warn('Firestore cloud referral lookup error:', error);
    return null;
  }
}

/**
 * Records a pending reward event in Firestore `referral_events`.
 * When User A logs into their device, this event is claimed and awards User A +500 credits.
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
  const eventId = `ref_evt_${inviter.referralCode}_${referee.userId}_${Date.now()}`;
  const eventPayload: CloudReferralRewardEvent = {
    inviterReferralCode: inviter.referralCode.toUpperCase(),
    inviterUserId: (inviter.userId || '').toLowerCase(),
    inviterEmail: (inviter.email || '').toLowerCase(),
    inviterName: inviter.fullName || 'Chartered Accountant',
    refereeUserId: referee.userId,
    refereeEmail: referee.email || '',
    refereeName: referee.fullName || referee.userId || 'Colleague',
    bonus: REFERRAL_CREDIT_BONUS,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  try {
    const eventRef = doc(db, 'referral_events', eventId);
    await setDoc(eventRef, eventPayload);
    return true;
  } catch (error) {
    console.warn('Could not record referral event in Firestore, saving to offline queue:', error);
    try {
      const raw = localStorage.getItem(STORAGE_PENDING_QUEUE);
      const queue: CloudReferralRewardEvent[] = raw ? JSON.parse(raw) : [];
      queue.push(eventPayload);
      localStorage.setItem(STORAGE_PENDING_QUEUE, JSON.stringify(queue));
    } catch {}
    return false;
  }
}

/**
 * Flushes any locally queued offline referral events to Firestore once online.
 */
export async function flushOfflineReferralEvents(): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_PENDING_QUEUE);
    if (!raw) return;
    const queue: CloudReferralRewardEvent[] = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return;

    const remaining: CloudReferralRewardEvent[] = [];
    for (const evt of queue) {
      try {
        const eventId = `ref_evt_${evt.inviterReferralCode}_${evt.refereeUserId}_${Date.now()}`;
        const eventRef = doc(db, 'referral_events', eventId);
        await setDoc(eventRef, evt);
      } catch {
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
 * Claims any pending referral reward events for the active user.
 * Awards +500 credits per referee, adds transaction records, and updates Firestore.
 */
export async function claimPendingReferralRewards(currentUser: UserProfile): Promise<{
  claimedCount: number;
  totalAwarded: number;
  refereeNames: string[];
  updatedUser?: UserProfile;
}> {
  if (!currentUser || !currentUser.referralCode) {
    return { claimedCount: 0, totalAwarded: 0, refereeNames: [] };
  }

  // Attempt to flush any offline events first
  await flushOfflineReferralEvents();

  const userCode = currentUser.referralCode.trim().toUpperCase();
  const userHandle = (currentUser.userId || '').trim().toLowerCase();
  const userEmail = (currentUser.email || '').trim().toLowerCase();

  try {
    const eventsRef = collection(db, 'referral_events');
    const matchedDocs: { docId: string; data: CloudReferralRewardEvent }[] = [];

    // Query by referralCode
    try {
      const qCode = query(
        eventsRef,
        where('inviterReferralCode', '==', userCode),
        where('status', '==', 'pending')
      );
      const snapCode = await getDocs(qCode);
      snapCode.forEach((d) => matchedDocs.push({ docId: d.id, data: d.data() as CloudReferralRewardEvent }));
    } catch (e) {
      console.warn('Error querying referral events by code:', e);
    }

    // Query by userHandle (if available)
    if (userHandle && userHandle.length >= 2) {
      try {
        const qUser = query(
          eventsRef,
          where('inviterUserId', '==', userHandle),
          where('status', '==', 'pending')
        );
        const snapUser = await getDocs(qUser);
        snapUser.forEach((d) => {
          if (!matchedDocs.some((m) => m.docId === d.id)) {
            matchedDocs.push({ docId: d.id, data: d.data() as CloudReferralRewardEvent });
          }
        });
      } catch (e) {
        console.warn('Error querying referral events by userId:', e);
      }
    }

    // Query by email (if available)
    if (userEmail && userEmail.includes('@')) {
      try {
        const qEmail = query(
          eventsRef,
          where('inviterEmail', '==', userEmail),
          where('status', '==', 'pending')
        );
        const snapEmail = await getDocs(qEmail);
        snapEmail.forEach((d) => {
          if (!matchedDocs.some((m) => m.docId === d.id)) {
            matchedDocs.push({ docId: d.id, data: d.data() as CloudReferralRewardEvent });
          }
        });
      } catch (e) {
        console.warn('Error querying referral events by email:', e);
      }
    }

    if (matchedDocs.length === 0) {
      return { claimedCount: 0, totalAwarded: 0, refereeNames: [] };
    }

    // Process all pending events
    const allUsers = loadUsersFromStorage();
    const active = allUsers.find((u) => u.id === currentUser.id) || currentUser;

    let claimedCount = 0;
    let totalAwarded = 0;
    const refereeNames: string[] = [];

    if (!Array.isArray(active.creditTransactions)) active.creditTransactions = [];

    for (const item of matchedDocs) {
      const evt = item.data;
      const bonus = typeof evt.bonus === 'number' ? evt.bonus : REFERRAL_CREDIT_BONUS;

      // Credit User A
      active.credits = (typeof active.credits === 'number' ? active.credits : 0) + bonus;
      active.referralsCount = (active.referralsCount || 0) + 1;
      active.totalReferralCredits = (active.totalReferralCredits || 0) + bonus;

      active.creditTransactions.unshift({
        id: 'tx_ref_claim_' + Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString(),
        amount: bonus,
        type: 'REFERRAL_REWARD',
        description: `+${bonus} Credits! Successfully referred ${evt.refereeName} (${evt.refereeUserId || evt.refereeEmail})`,
        balanceAfter: active.credits,
      });

      claimedCount++;
      totalAwarded += bonus;
      refereeNames.push(evt.refereeName || evt.refereeUserId || 'Colleague');

      // Update Firestore document status to 'claimed'
      try {
        const docRef = doc(db, 'referral_events', item.docId);
        await updateDoc(docRef, {
          status: 'claimed',
          claimedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn(`Failed to update claimed status for event ${item.docId}:`, err);
      }
    }

    // Persist updated user profile
    saveUsersToStorage(allUsers);

    return {
      claimedCount,
      totalAwarded,
      refereeNames,
      updatedUser: active,
    };
  } catch (error) {
    console.warn('Error claiming pending referral rewards from Firestore:', error);
    return { claimedCount: 0, totalAwarded: 0, refereeNames: [] };
  }
}
