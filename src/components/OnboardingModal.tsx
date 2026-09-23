import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Phone,
  User,
  Gift,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserProfile, applyReferralRewardAsync, loadUsersFromStorage } from '../utils/storageManager';

interface OnboardingModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onComplete: (updatedUser: UserProfile) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  currentUser,
  onComplete,
}) => {
  const [userIdInput, setUserIdInput] = useState(
    currentUser.userId || currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
  );
  const [mobileInput, setMobileInput] = useState(currentUser.mobile || '');
  const [firmNameInput, setFirmNameInput] = useState(currentUser.firmName || '');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [showReferralField, setShowReferralField] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check for pending referral code from URL or sessionStorage on mount
  useEffect(() => {
    if (isOpen && !currentUser.referredBy) {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlRef = params.get('ref');
        const sessionRef = sessionStorage.getItem('ca_pending_referral_code');
        const found = (urlRef || sessionRef || '').trim();
        if (found) {
          setReferralCodeInput(found);
          setShowReferralField(true);
        }
      } catch {}
    }
  }, [isOpen, currentUser.referredBy]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUserId = userIdInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanMobile = mobileInput.replace(/[^0-9]/g, '');

    if (!cleanUserId || cleanUserId.length < 3) {
      setError('Please choose a valid User ID with at least 3 alphanumeric characters.');
      return;
    }

    if (!cleanMobile || cleanMobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Check if User ID is taken by another user
    const allUsers = loadUsersFromStorage();
    const existing = allUsers.find(
      (u) => u.id !== currentUser.id && u.userId && u.userId.toLowerCase() === cleanUserId
    );
    if (existing) {
      setError(`User ID "@${cleanUserId}" is already taken. Please choose another.`);
      return;
    }

    setLoading(true);

    try {
      let updated: UserProfile = {
        ...currentUser,
        userId: cleanUserId,
        mobile: cleanMobile,
        firmName: firmNameInput.trim() || 'Chartered Accountant Practice',
      };

      // Apply referral code if provided
      if (referralCodeInput.trim()) {
        const refRes = await applyReferralRewardAsync(currentUser.id, referralCodeInput.trim());
        if (!refRes.success) {
          setError(refRes.error || 'Invalid referral code or user ID entered.');
          setLoading(false);
          return;
        }
        try {
          sessionStorage.removeItem('ca_pending_referral_code');
        } catch {}
      }

      // Reload fresh profile from storage if referral updated it, else update directly
      const freshUsers = loadUsersFromStorage();
      const fresh = freshUsers.find((u) => u.id === currentUser.id);
      if (fresh) {
        fresh.userId = cleanUserId;
        fresh.mobile = cleanMobile;
        fresh.firmName = firmNameInput.trim() || fresh.firmName;
        updateUserProfile(fresh);
        onComplete(fresh);
      } else {
        updateUserProfile(updated);
        onComplete(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete profile setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Celebration Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-7 border-b border-emerald-900/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                Welcome to CA Financial Agent
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
                Complete Your Account
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Welcome, <span className="text-white font-semibold">{currentUser.fullName}</span>! Please set your unique User ID handle and contact mobile number to finalize your statutory workspace.
          </p>

          <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-900/40 border border-emerald-700/50 text-[11px] text-emerald-200 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>100 Welcome Credits activated • ICAI NCE Compliance ready</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* User ID Handle */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Choose Your User ID Handle *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">@</span>
              <input
                type="text"
                required
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="ca_rajesh"
                className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Used for colleague referrals, workpapers, and fast sign-in.
            </p>
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Registered Mobile Number *
            </label>
            <div className="relative flex">
              <span className="inline-flex items-center px-3 py-2 border border-r-0 border-slate-300 bg-slate-50 text-slate-600 font-semibold text-xs rounded-l-xl">
                +91
              </span>
              <input
                type="tel"
                required
                maxLength={10}
                value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="9876543210"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-r-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              For security notifications and statutory export verifications.
            </p>
          </div>

          {/* Firm Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              CA Firm / Practice Name (Optional)
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={firmNameInput}
                onChange={(e) => setFirmNameInput(e.target.value)}
                placeholder="e.g. Sharma & Associates, Chartered Accountants"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Referral Code Accordion (+500 Credits) */}
          <div className="pt-1">
            {!showReferralField ? (
              <button
                type="button"
                onClick={() => setShowReferralField(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition hover:underline cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5 text-emerald-600" />
                <span>Have a colleague's referral code or User ID? Claim +500 free credits</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <Gift className="w-4 h-4 text-emerald-600" />
                    <span>Referral Code, User ID (@handle), or Email (+500 Credits)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReferralField(false);
                      setReferralCodeInput('');
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value)}
                  placeholder="e.g. REF-RAJESH100, @ca_rajesh, or rajesh@gmail.com"
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-emerald-700 font-medium">
                  Both you and your colleague will receive 500 bonus credits!
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            {loading ? 'Finalizing Profile...' : 'Complete Profile & Enter Workspace'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
