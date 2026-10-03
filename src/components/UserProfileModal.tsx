import React, { useState } from 'react';
import {
  X,
  User,
  Building2,
  Award,
  Mail,
  Phone,
  CreditCard,
  Zap,
  Clock,
  Download,
  CheckCircle2,
  Printer,
  ShieldCheck,
  Receipt,
  FileText,
  Gift,
  Copy,
  Check,
  Coins,
  Scale,
  LogOut,
} from 'lucide-react';
import { UserProfile, UserInvoice } from '../types';
import { SUBSCRIPTION_PLANS, formatCurrencyINR } from '../data/subscriptionPlans';
import { updateUserProfile, loadUsersFromStorage } from '../utils/storageManager';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onProfileUpdated: (updatedUser: UserProfile) => void;
  onOpenSubscriptionModal: () => void;
  onOpenReferralModal?: () => void;
  onOpenTermsModal?: () => void;
  onLogout?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
  onOpenSubscriptionModal,
  onOpenReferralModal,
  onOpenTermsModal,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'credits'>('profile');

  // Form state
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [userIdHandle, setUserIdHandle] = useState(currentUser?.userId || '');
  const [firmName, setFirmName] = useState(currentUser?.firmName || '');
  const [membershipNo, setMembershipNo] = useState(currentUser?.membershipNo || '');
  const [pan, setPan] = useState(currentUser?.pan || '');
  const [gstin, setGstin] = useState(currentUser?.gstin || '');
  const [mobile, setMobile] = useState(currentUser?.mobile || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Selected invoice for receipt viewer
  const [viewingInvoice, setViewingInvoice] = useState<UserInvoice | null>(null);

  if (!isOpen || !currentUser) return null;

  const currentPlan =
    SUBSCRIPTION_PLANS.find((p) => p.id === currentUser.planTier) || SUBSCRIPTION_PLANS[0];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const cleanUserHandle = userIdHandle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!cleanUserHandle || cleanUserHandle.length < 3) {
      setSaveError('User ID must be at least 3 characters.');
      return;
    }

    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile && cleanMobile.length < 10) {
      setSaveError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Check if user ID is taken by another user
    const allUsers = loadUsersFromStorage();
    const existing = allUsers.find(
      (u) => u.id !== currentUser.id && u.userId && u.userId.toLowerCase() === cleanUserHandle
    );
    if (existing) {
      setSaveError(`User ID "@${cleanUserHandle}" is already taken by another account.`);
      return;
    }

    const updated: UserProfile = {
      ...currentUser,
      fullName: fullName.trim(),
      userId: cleanUserHandle,
      firmName: firmName.trim(),
      membershipNo: membershipNo.trim(),
      pan: pan.trim().toUpperCase(),
      gstin: gstin.trim().toUpperCase(),
      mobile: cleanMobile,
    };

    const ok = updateUserProfile(updated);
    if (ok) {
      onProfileUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError('Failed to save profile changes.');
    }
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(currentUser.referralCode || 'REF-CA100');
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {currentUser.fullName}
                </h2>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.2 rounded-full border border-emerald-800">
                  @{currentUser.userId || currentUser.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentUser.firmName || 'Chartered Accountant'} • {currentUser.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-4 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Auditor & Firm Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('credits')}
            className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'credits'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Credits &amp; Referrals</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
              ⚡ {currentUser.credits}
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto p-6 flex-1 space-y-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Profile and contact details saved successfully!</span>
                </div>
              )}

              {saveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <span>{saveError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Auditor / Practitioner Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    User ID Handle *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">@</span>
                    <input
                      type="text"
                      required
                      value={userIdHandle}
                      onChange={(e) => setUserIdHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))}
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Registered Mobile Number
                  </label>
                  <div className="relative flex">
                    <span className="inline-flex items-center px-3 py-2 border border-r-0 border-slate-300 bg-slate-50 text-slate-600 font-semibold text-xs rounded-l-xl">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 border border-slate-300 rounded-r-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CA Firm Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      placeholder="e.g. M/s Viva & Associates"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ICAI Membership Number
                  </label>
                  <div className="relative">
                    <Award className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={membershipNo}
                      onChange={(e) => setMembershipNo(e.target.value)}
                      placeholder="e.g. 054321"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Firm PAN
                  </label>
                  <input
                    type="text"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 uppercase focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                {onLogout ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Compliance with ICAI Non-Corporate Entity Guidelines</span>
                </div>
                {onOpenTermsModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTermsModal();
                    }}
                    className="text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer text-left sm:text-right"
                  >
                    View Terms of Service &amp; Disclaimer
                  </button>
                )}
              </div>
            </form>
          )}

          {activeTab === 'credits' && (
            <div className="space-y-6">
              {/* Credit Status Banner */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400">Available Balance</span>
                  <h3 className="text-3xl font-black text-white mt-0.5">
                    ⚡ {currentUser.credits.toLocaleString()} Credits
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Active on plan: <strong className="text-white">Credits</strong>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSubscriptionModal();
                    }}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Top-Up via Razorpay</span>
                  </button>
                </div>
              </div>

              {/* Razorpay GST Invoices Summary */}
              {currentUser.invoices && currentUser.invoices.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Receipt className="w-4 h-4 text-sky-600" />
                      <span>Razorpay GST Invoices ({currentUser.invoices.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSubscriptionModal();
                      }}
                      className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
                    >
                      View All Invoices →
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {currentUser.invoices.slice(0, 4).map((inv) => (
                      <div
                        key={inv.id}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono tabular-nums"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                          <span className="font-sans text-slate-500 ml-2">· {inv.planName}</span>
                          <div className="text-[10px] text-slate-400">
                            Payment ID: {inv.transactionId}
                          </div>
                        </div>
                        <div className="font-bold text-emerald-700">
                          ₹{inv.totalAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Referral Box */}
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">
                        Earn 500 Credits per Colleague Referral
                      </h4>
                      <p className="text-[11px] text-emerald-700">
                        Share your unique referral code with peer auditors
                      </p>
                    </div>
                  </div>
                  {onOpenReferralModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenReferralModal();
                      }}
                      className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                    >
                      View Referral Hub →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="px-3.5 py-2 bg-white border border-emerald-300 rounded-xl font-mono text-sm font-black text-slate-900">
                    {currentUser.referralCode || 'REF-CA100'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyReferral}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{codeCopied ? 'Copied' : 'Copy Code'}</span>
                  </button>
                  <span className="text-[11px] text-slate-500 ml-2">
                    Invited: <strong>{currentUser.referralsCount || 0} colleagues</strong> (+{currentUser.totalReferralCredits || 0} credits earned)
                  </span>
                </div>
              </div>

              {/* Transaction History */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Credit Activity Ledger
                </h4>
                {currentUser.creditTransactions && currentUser.creditTransactions.length > 0 ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {currentUser.creditTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
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
                        <div
                          className={`font-black ${
                            tx.amount > 0 ? 'text-emerald-600' : 'text-slate-700'
                          }`}
                        >
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount} Credits
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No credit activity logged yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
