import React, { useState, useEffect } from 'react';
import {
  X,
  Gift,
  Copy,
  Check,
  Users,
  Zap,
  Sparkles,
  CheckCircle2,
  Mail,
  MessageSquare,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  claimPendingReferralRewards,
  syncUserReferralToCloud,
} from '../services/referralCloudService';
import {
  applyReferralRewardAsync,
  loadActiveUserFromStorage,
} from '../utils/storageManager';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUserUpdated?: (updatedUser: UserProfile) => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [claimInput, setClaimInput] = useState('');
  const [claimingCode, setClaimingCode] = useState(false);

  // Automatically sync & claim any pending referral rewards when modal opens
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    setSyncMessage(null);

    let isMounted = true;
    const autoSync = async () => {
      try {
        await syncUserReferralToCloud(currentUser);
        const res = await claimPendingReferralRewards(currentUser);
        if (!isMounted) return;
        if (res.claimedCount > 0 && res.updatedUser) {
          onUserUpdated?.(res.updatedUser);
          setSyncMessage({
            type: 'success',
            text: `🎁 Claimed +${res.totalAwarded} Referral Credits from ${res.refereeNames.join(', ')}!`,
          });
        } else {
          const fresh = loadActiveUserFromStorage();
          if (fresh && fresh.credits !== currentUser.credits) {
            onUserUpdated?.(fresh);
          }
        }
      } catch {
        // ignore
      }
    };

    autoSync();
    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUser?.id]);

  if (!isOpen) return null;

  const referralCode = currentUser.referralCode || 'REF-CA100';
  const referralUrl = `${window.location.origin}${window.location.pathname}?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleManualSyncRewards = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      await syncUserReferralToCloud(currentUser);
      const res = await claimPendingReferralRewards(currentUser);
      if (res.claimedCount > 0 && res.updatedUser) {
        onUserUpdated?.(res.updatedUser);
        setSyncMessage({
          type: 'success',
          text: `🎁 Added +${res.totalAwarded} Referral Credits! Referred: ${res.refereeNames.join(', ')}`,
        });
      } else {
        const fresh = loadActiveUserFromStorage();
        if (fresh) {
          onUserUpdated?.(fresh);
        }
        setSyncMessage({
          type: 'info',
          text: 'Referral ledger synced! All earned referral credits are up to date.',
        });
      }
    } catch {
      setSyncMessage({
        type: 'error',
        text: 'Could not reach cloud referral service. Please try again.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClaimColleagueCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimInput.trim()) return;
    setClaimingCode(true);
    setSyncMessage(null);
    try {
      // Allow pasting either a full referral URL (?ref=REF-...) or a code/handle/email
      let codeToApply = claimInput.trim();
      if (codeToApply.includes('ref=')) {
        try {
          const url = new URL(codeToApply);
          codeToApply = url.searchParams.get('ref') || codeToApply;
        } catch {
          const match = codeToApply.match(/[?&]ref=([^&#\s]+)/i);
          if (match?.[1]) codeToApply = decodeURIComponent(match[1]);
        }
      }

      const res = await applyReferralRewardAsync(currentUser.id, codeToApply);
      if (res.success) {
        const fresh = loadActiveUserFromStorage();
        if (fresh) onUserUpdated?.(fresh);
        setClaimInput('');
        setSyncMessage({
          type: 'success',
          text: `🎉 +${res.bonusGranted} Credits added! Both you and ${res.inviterName || 'your colleague'} received +500 credits.`,
        });
      } else {
        setSyncMessage({
          type: 'error',
          text: res.error || 'Could not apply referral code.',
        });
      }
    } catch (err: any) {
      setSyncMessage({
        type: 'error',
        text: err.message || 'Error applying referral code.',
      });
    } finally {
      setClaimingCode(false);
    }
  };

  const userHandle = currentUser.userId ? `@${currentUser.userId.replace(/^@/, '')}` : referralCode;
  const shareText = `Join me on CA Financial Statement Agent for automated ICAI Non-Corporate Entity statutory audits and financial statements! Use my referral code ${referralCode} (or User ID ${userHandle}) to get 500 FREE credits: ${referralUrl}`;

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent('500 Free Credits for CA Financial Statement Agent');
    const body = encodeURIComponent(shareText);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // Filter transactions for referral bonuses
  const referralTransactions = (currentUser.creditTransactions || []).filter(
    (t) => t.type === 'REFERRAL_REWARD' || t.type === 'REFERRED_WELCOME_BONUS'
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-900 text-white p-6 sm:p-7 relative overflow-hidden border-b border-emerald-800/60">
          <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center text-slate-950 shadow-md">
                <Gift className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/60">
                  Referral Rewards Program
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                  Give 500 Credits, Get 500 Credits
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-emerald-100/90 mt-3 max-w-xl leading-relaxed">
            Invite fellow Chartered Accountants, article assistants, and auditing colleagues. When they sign in or register using your referral link or code, <span className="font-bold text-amber-300">both of you get 500 credits</span> added to your account instantly!
          </p>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {syncMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                syncMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : syncMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {syncMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{syncMessage.text}</span>
            </div>
          )}

          {/* Live Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Your Balance</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {currentUser.credits.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">Credits Available</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Colleagues Invited</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {currentUser.referralsCount || 0}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Auditors Joined</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
                <Gift className="w-3.5 h-3.5 text-emerald-500" />
                <span>Referral Bonus</span>
              </div>
              <div className="text-2xl font-black text-emerald-600">
                +{(currentUser.totalReferralCredits || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">Credits Earned</span>
            </div>
          </div>

          {/* Share Code & Link Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Your Unique Referral Code
              </label>
              <button
                type="button"
                onClick={handleManualSyncRewards}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync Referral Credits'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2.5 bg-white border border-emerald-300 rounded-xl font-mono text-base font-black text-slate-900 tracking-wider shadow-xs">
                {referralCode}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                Or Share Direct Invite Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-600 truncate focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleShareEmail}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Share via Email</span>
              </button>
            </div>

            <div className="p-3 bg-white/90 rounded-xl border border-emerald-200/90 text-[11px] text-emerald-950 flex items-start gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Flexible Colleague Referral:</strong> Your colleague can sign in or register using your Referral Link, Referral Code (<strong>{referralCode}</strong>), User ID handle (<strong>{userHandle}</strong>), or email. Both parties receive +500 credits!
              </span>
            </div>
          </div>

          {/* Redeem a Colleague's Referral Code or Link (if not yet referred) */}
          {!currentUser.referredBy && (
            <form
              onSubmit={handleClaimColleagueCode}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
            >
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Were You Referred by a Colleague? Claim +500 Credits
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={claimInput}
                  onChange={(e) => setClaimInput(e.target.value)}
                  placeholder="Paste referral link, code (REF-...), @handle, or inviter email"
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={claimingCode || !claimInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {claimingCode ? 'Claiming...' : 'Claim +500'}
                </button>
              </div>
            </form>
          )}

          {/* What 500 Credits Unlocks */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>What 500 Credits Unlocks in Your Practice</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="font-extrabold text-slate-900">100 Mappings</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  AI Schedule & Note mapping runs (5 credits each)
                </div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="font-extrabold text-slate-900">50 Full Audits</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  ICAI Form 3CD/3CB exception diagnostics (10 credits each)
                </div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="font-extrabold text-slate-900">100 Excel Workbooks</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Statutory Notes 3 to 25 formatted exports (5 credits each)
                </div>
              </div>
            </div>
          </div>

          {/* Referral Activity Ledger */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Referral Reward History
            </h4>
            {referralTransactions.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No referral credits claimed yet. Share your code to earn your first 500 credits!
              </div>
            ) : (
              <div className="space-y-2">
                {referralTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        🎁
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{tx.description}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(tx.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-emerald-600">
                      +{tx.amount} Credits
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
