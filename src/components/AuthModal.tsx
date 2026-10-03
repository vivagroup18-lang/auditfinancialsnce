import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Building2,
  Phone,
  Award,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  Gift,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  authenticateUser,
  registerUser,
  authenticateGoogleUser,
  getPendingReferralCode,
  clearPendingReferralCode,
  loginAsGuest,
} from '../utils/storageManager';
import { googleSignIn, googleSignInStandard, isPopupBlockedOrUnauthorized } from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  onGoogleAuthSuccess?: (user: UserProfile, isNewUser: boolean, accessToken?: string) => void;
  initialTab?: 'signin' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onGoogleAuthSuccess,
  initialTab = 'signin',
}) => {
  const [tab, setTab] = useState<'signin' | 'register'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Sign in fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [userIdHandle, setUserIdHandle] = useState('');
  const [firmName, setFirmName] = useState('');
  const [membershipNo, setMembershipNo] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [showReferralInput, setShowReferralInput] = useState(false);

  // Check for pending referral code from URL param (?ref=...), sessionStorage, or localStorage on modal open
  useEffect(() => {
    if (isOpen) {
      try {
        const found = getPendingReferralCode();
        if (found) {
          setReferralCodeInput(found);
          setShowReferralInput(true);
          if (initialTab !== 'signin') {
            setTab('register');
          }
        } else {
          setTab(initialTab);
        }
      } catch {}
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginIdentifier.trim()) {
      setError('Please enter your registered Email, Mobile, or User ID.');
      return;
    }

    setLoading(true);
    try {
      const effectiveReferral = referralCodeInput.trim() || getPendingReferralCode() || undefined;
      const res = authenticateUser(loginIdentifier, loginPassword || undefined, effectiveReferral);
      if (res.success && res.user) {
        if (res.referralClaimed) {
          clearPendingReferralCode();
        }
        onAuthSuccess(res.user);
        onClose();
      } else {
        setError(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    const cleanUserHandle = (
      userIdHandle.trim() || regEmail.split('@')[0]
    ).toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    if (cleanUserHandle.length < 3) {
      setError('User ID handle must be at least 3 characters.');
      return;
    }

    setLoading(true);
    try {
      const effectiveReferral = referralCodeInput.trim() || getPendingReferralCode() || undefined;

      const res = registerUser({
        id: 'USER_' + cleanUserHandle.toUpperCase(),
        userId: cleanUserHandle,
        fullName: fullName.trim(),
        email: regEmail.trim().toLowerCase(),
        mobile: regMobile.trim(),
        firmName: firmName.trim() || 'Chartered Accountant Practice',
        membershipNo: membershipNo.trim(),
        password: regPassword,
        referralCodeInput: effectiveReferral,
      });

      if (res.success && res.user) {
        clearPendingReferralCode();
        onAuthSuccess(res.user);
        onClose();
      } else {
        setError(res.error || 'Failed to create account.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while creating account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setDomainError(null);
    setLoading(true);
    try {
      // Standard safe Google Sign-In for app authentication
      const res = await googleSignInStandard();

      if (res.user && res.user.email) {
        const effectiveReferral = referralCodeInput.trim() || getPendingReferralCode() || undefined;

        const authRes = authenticateGoogleUser({
          email: res.user.email,
          name: res.user.displayName || undefined,
          picture: res.user.photoURL || undefined,
          referralCode: effectiveReferral,
        });

        if (authRes.success && authRes.user) {
          clearPendingReferralCode();
          if (onGoogleAuthSuccess) {
            onGoogleAuthSuccess(authRes.user, !!authRes.isNewUser, res.accessToken);
          } else {
            onAuthSuccess(authRes.user);
          }
          onClose();
        } else {
          setError(authRes.error || 'Failed to sync Google user profile.');
        }
      }
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err?.message || err);
      const isDomain =
        err?.isDomainError ||
        String(err?.message || '').includes('unauthorized-domain') ||
        String(err?.code || '').includes('unauthorized-domain') ||
        String(err?.message || '').includes('not authorized');

      if (isDomain) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'fintaxaudit.vivaproject.in';
        setDomainError(hostname);
      }
      setError(err?.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    const guestUser = loginAsGuest();
    onAuthSuccess(guestUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white px-6 py-5 flex items-start justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white">
                  CA Financial Statement Agent
                </h2>
                <p className="text-[11px] text-emerald-400 font-medium">
                  ICAI Non-Corporate Entity Statutory Automation
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              {tab === 'signin'
                ? 'Sign in to access your audit clients, custom taxonomies & credit balance.'
                : 'Create your CA practitioner account & claim 555 welcome credit points (+500 with referral).'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              tab === 'signin'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Create CA Account</span>
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {domainError && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-800 text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Domain Authorization Required in Firebase</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px]">
                Your published domain <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-mono font-bold">{domainError}</code> must be authorized before Google can authenticate users:
              </p>
              <div className="bg-white/90 p-3 rounded-xl border border-amber-200 text-[11px] text-slate-700 space-y-1.5">
                <div><strong>1.</strong> Open <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">Firebase Console</a> &rarr; Project: <code className="font-mono text-slate-900 font-bold">gen-lang-client-0873724595</code></div>
                <div><strong>2.</strong> Go to <strong>Authentication</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Authorized domains</strong></div>
                <div><strong>3.</strong> Click <strong>Add domain</strong> &rarr; Paste: <code className="font-mono text-emerald-700 font-bold">{domainError}</code> &rarr; Save</div>
                <div><strong>4.</strong> In Google Cloud Console &rarr; Credentials &rarr; OAuth 2.0 Client &rarr; Add <code className="font-mono text-emerald-700 font-bold">https://{domainError}</code> to Authorized JavaScript origins.</div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(domainError);
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 3000);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDomain ? 'Copied to Clipboard!' : `Copy Domain (${domainError})`}</span>
                </button>
                <span className="text-[10px] text-slate-500">Takes effect in ~10 seconds!</span>
              </div>
            </div>
          )}

          {/* Quick 1-Click Google OAuth SSO */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2.5 text-slate-400 font-bold tracking-wider">
                Or with Email / Mobile / User ID
              </span>
            </div>
          </div>

          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email, Mobile, or User ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="ca_balaji, 9876543210, or email@firm.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <span className="text-[11px] text-slate-400">(Optional for demo)</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Referral Code input on Sign-In Tab as well */}
              <div>
                {!showReferralInput ? (
                  <button
                    type="button"
                    onClick={() => setShowReferralInput(true)}
                    className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Gift className="w-3 h-3 text-emerald-600" />
                    <span>Logging in with a referral code or link? (+500 Free Credits)</span>
                  </button>
                ) : (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                      <span className="flex items-center gap-1">
                        <Gift className="w-3 h-3 text-emerald-600" />
                        Referral Code / Link Applied (+500 Credits)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowReferralInput(false);
                          setReferralCodeInput('');
                        }}
                        className="text-slate-400 hover:text-slate-600 text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="text"
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value)}
                      placeholder="e.g. REF-BALAJI100, @ca_balaji, or balaji@gmail.com"
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-emerald-700">
                      🎁 Both you and the sender of the referral receive +500 free credits upon login.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name / Practitioner Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="CA. Balaji Rao"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    User ID Handle *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-bold">@</span>
                    <input
                      type="text"
                      required
                      value={userIdHandle}
                      onChange={(e) => setUserIdHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="ca_balaji"
                      className="w-full pl-7 pr-2 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="9876543210"
                      className="w-full pl-8 pr-2 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="balaji@viva-ca.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Set Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full pl-8 pr-2 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CA Firm Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      placeholder="Viva & Co."
                      className="w-full pl-8 pr-2 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Referral Code accordion */}
              <div>
                {!showReferralInput ? (
                  <button
                    type="button"
                    onClick={() => setShowReferralInput(true)}
                    className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Gift className="w-3 h-3 text-emerald-600" />
                    <span>Have a referral code or colleague ID? (+500 Free Credits)</span>
                  </button>
                ) : (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                      <span className="flex items-center gap-1">
                        <Gift className="w-3 h-3 text-emerald-600" />
                        Referral Code, User ID (@handle), or Email
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowReferralInput(false);
                          setReferralCodeInput('');
                        }}
                        className="text-slate-400 hover:text-slate-600 text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="text"
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value)}
                      placeholder="e.g. REF-BALAJI100, @ca_balaji, or balaji@gmail.com"
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-emerald-700">
                      🎁 Both you and your colleague receive +500 free credits upon signup.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Includes 555 welcome credit points + 14-day full statutory features.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Create Account & Start Trial'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Guest Login Option — Only triggered when user explicitly clicks this button */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="rounded-2xl bg-slate-50 border border-slate-200/90 p-3.5 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Just exploring? Try Guest Mode</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  555 free credits • Offline local storage • No password needed
                </div>
              </div>
              <button
                type="button"
                onClick={handleGuestContinue}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                <span>Guest Login</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
