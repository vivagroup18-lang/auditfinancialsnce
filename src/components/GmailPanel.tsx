import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  FileEdit,
  Inbox,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Building2,
  LogOut,
  Eye,
  Copy,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  HelpCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import {
  getGmailProfile,
  listGmailMessages,
  getGmailMessageDetail,
  sendGmailEmail,
  createGmailDraft,
  trashGmailMessage,
  type GmailProfile,
  type GmailMessageSummary,
  type GmailMessageDetail,
  type SendEmailParams,
} from '../services/gmailService';
import { isGoogleAuthExpired } from '../services/driveService';
import { CA_EMAIL_TEMPLATES, type EmailTemplateOption } from '../utils/caEmailTemplates';
import { EntityConfig, BalanceSheetReport, ProfitLossReport, MappedLedger } from '../types';
import { googleSignIn, googleLogout, getAccessToken } from '../firebase';
import type { User } from 'firebase/auth';

interface GmailPanelProps {
  config: EntityConfig;
  balanceSheet?: BalanceSheetReport;
  profitAndLoss?: ProfitLossReport;
  mappedLedgers?: MappedLedger[];
  user: User | null;
  accessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onSignOut: () => void;
  initialTemplateId?: string;
}

export const GmailPanel: React.FC<GmailPanelProps> = ({
  config,
  balanceSheet,
  profitAndLoss,
  mappedLedgers = [],
  user,
  accessToken,
  onAuthSuccess,
  onSignOut,
  initialTemplateId,
}) => {
  // Navigation inside Gmail tab
  const [subTab, setSubTab] = useState<'compose' | 'inbox' | 'confirmations'>('compose');

  // Auth / connection state
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Composer state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplateId || 'financial_statements_transmittal'
  );
  const [toEmail, setToEmail] = useState<string>('');
  const [ccEmail, setCcEmail] = useState<string>('');
  const [bccEmail, setBccEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [bodyHtml, setBodyHtml] = useState<string>('');
  const [showHtmlPreview, setShowHtmlPreview] = useState<boolean>(true);
  const [isSending, setIsSending] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  // Mandatory confirmation modal for destructive/sending operation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    actionType: 'send' | 'draft' | 'trash';
    targetId?: string;
    details?: {
      to?: string;
      subject?: string;
    };
  }>({
    isOpen: false,
    actionType: 'send',
  });

  // Inbox state
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [messageDetail, setMessageDetail] = useState<GmailMessageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // SA 505 Balance Confirmation Party Picker
  const [selectedPartyLedger, setSelectedPartyLedger] = useState<string>('');
  const [partyEmail, setPartyEmail] = useState<string>('');

  // Eligible party ledgers (Trade Receivables Note 16, Cash & Bank Note 17, Trade Payables Note 9)
  const partyLedgers = useMemo(() => {
    return mappedLedgers.filter((l) => [9, 10, 16, 17].includes(l.noteNumber));
  }, [mappedLedgers]);

  // Load template content when template selection changes
  useEffect(() => {
    const tmpl = CA_EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId) || CA_EMAIL_TEMPLATES[0];
    if (tmpl) {
      setSubject(tmpl.defaultSubject(config));
      const html = tmpl.generateHtml(config, balanceSheet, profitAndLoss);
      setBodyHtml(html);
    }
  }, [selectedTemplateId, config, balanceSheet, profitAndLoss]);

  // Fetch Gmail profile and initial messages when token is available
  useEffect(() => {
    if (accessToken) {
      loadProfileAndInbox();
    } else {
      setProfile(null);
      setMessages([]);
    }
  }, [accessToken]);

  const loadProfileAndInbox = async () => {
    if (!accessToken) return;
    setProfileLoading(true);
    try {
      const p = await getGmailProfile(accessToken);
      setProfile(p);
      loadInbox('');
    } catch (err: any) {
      if (isGoogleAuthExpired(err)) {
        console.warn('[GmailPanel] Google session expired.');
        onSignOut();
        setStatusMessage({
          type: 'error',
          text: 'Google Workspace session has expired. Please sign in with Google to reconnect.',
        });
      } else {
        console.warn('[GmailPanel] Failed to load Gmail profile:', err?.message || err);
        setStatusMessage({
          type: 'error',
          text: `Unable to access Gmail: ${err.message || 'Token may have expired. Please re-authenticate.'}`,
        });
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const loadInbox = async (query: string = '') => {
    if (!accessToken) return;
    setInboxLoading(true);
    try {
      const list = await listGmailMessages(accessToken, query, 15);
      setMessages(list);
    } catch (err: any) {
      if (isGoogleAuthExpired(err)) {
        console.warn('[GmailPanel] Google session expired.');
        onSignOut();
        setStatusMessage({
          type: 'error',
          text: 'Google Workspace session has expired. Please sign in with Google to reconnect.',
        });
      } else {
        console.warn('[GmailPanel] Failed to load messages:', err?.message || err);
        setStatusMessage({
          type: 'error',
          text: `Error fetching Gmail messages: ${err.message}`,
        });
      }
    } finally {
      setInboxLoading(false);
    }
  };

  const handleSelectMessage = async (msgId: string) => {
    if (!accessToken) return;
    setActiveMessageId(msgId);
    setDetailLoading(true);
    try {
      const detail = await getGmailMessageDetail(accessToken, msgId);
      setMessageDetail(detail);
    } catch (err: any) {
      if (isGoogleAuthExpired(err)) {
        console.warn('[GmailPanel] Google session expired.');
        onSignOut();
        setStatusMessage({
          type: 'error',
          text: 'Google Workspace session has expired. Please sign in with Google to reconnect.',
        });
      } else {
        console.warn('[GmailPanel] Error fetching message details:', err?.message || err);
        setStatusMessage({
          type: 'error',
          text: `Could not load email content: ${err.message}`,
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onAuthSuccess(result.user, result.accessToken);
        setStatusMessage({
          type: 'success',
          text: `Successfully connected Gmail for ${result.user.email}!`,
        });
      }
    } catch (err: any) {
      console.error('Sign-in failure:', err);
      setStatusMessage({
        type: 'error',
        text: `Sign-in failed: ${err.message || 'Please check popup permissions.'}`,
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await googleLogout();
    onSignOut();
    setProfile(null);
    setMessages([]);
    setMessageDetail(null);
    setActiveMessageId(null);
    setStatusMessage({
      type: 'info',
      text: 'Disconnected Gmail session.',
    });
  };

  // Trigger Send Confirmation Modal (MANDATORY per workspace skill)
  const triggerSendEmail = () => {
    if (!toEmail.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a recipient email address.' });
      return;
    }
    if (!subject.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter an email subject.' });
      return;
    }

    setConfirmModal({
      isOpen: true,
      actionType: 'send',
      details: {
        to: toEmail.trim(),
        subject: subject.trim(),
      },
    });
  };

  // Execute Send after explicit user confirmation
  const executeSendEmail = async () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    if (!accessToken) {
      setStatusMessage({ type: 'error', text: 'Gmail is not connected. Please sign in with Google first.' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);
    try {
      const params: SendEmailParams = {
        to: toEmail.trim(),
        from: profile?.emailAddress || user?.email || undefined,
        cc: ccEmail.trim() || undefined,
        bcc: bccEmail.trim() || undefined,
        subject: subject.trim(),
        bodyHtml,
      };

      const res = await sendGmailEmail(accessToken, params);
      setStatusMessage({
        type: 'success',
        text: `Email successfully sent via Gmail! Message ID: ${res.id}`,
      });
      // Refresh inbox
      loadInbox('');
    } catch (err: any) {
      if (isGoogleAuthExpired(err)) {
        console.warn('[GmailPanel] Google session expired.');
        onSignOut();
        setStatusMessage({
          type: 'error',
          text: 'Google Workspace session has expired. Please sign in with Google to reconnect.',
        });
      } else {
        console.warn('[GmailPanel] Failed to send email:', err?.message || err);
        setStatusMessage({
          type: 'error',
          text: `Failed to send email via Gmail: ${err.message}`,
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  // Save Draft in Gmail
  const handleSaveDraft = async () => {
    if (!accessToken) {
      setStatusMessage({ type: 'error', text: 'Gmail is not connected. Please sign in first.' });
      return;
    }
    if (!toEmail.trim() && !subject.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide at least a recipient or subject to save a draft.' });
      return;
    }

    setIsDrafting(true);
    setStatusMessage(null);
    try {
      const params: SendEmailParams = {
        to: toEmail.trim() || profile?.emailAddress || 'draft@example.com',
        from: profile?.emailAddress || user?.email || undefined,
        cc: ccEmail.trim() || undefined,
        bcc: bccEmail.trim() || undefined,
        subject: subject.trim() || '(Draft CA Financial Notice)',
        bodyHtml,
      };

      await createGmailDraft(accessToken, params);
      setStatusMessage({
        type: 'success',
        text: 'Draft successfully saved to your Gmail account!',
      });
    } catch (err: any) {
      if (isGoogleAuthExpired(err)) {
        console.warn('[GmailPanel] Google session expired.');
        onSignOut();
        setStatusMessage({
          type: 'error',
          text: 'Google Workspace session has expired. Please sign in with Google to reconnect.',
        });
      } else {
        console.warn('[GmailPanel] Failed to save draft:', err?.message || err);
        setStatusMessage({
          type: 'error',
          text: `Failed to save draft in Gmail: ${err.message}`,
        });
      }
    } finally {
      setIsDrafting(false);
    }
  };

  // Trigger Trash Confirmation Modal
  const triggerTrashMessage = (msgId: string) => {
    setConfirmModal({
      isOpen: true,
      actionType: 'trash',
      targetId: msgId,
      details: {
        subject: messageDetail?.subject || 'Selected Message',
      },
    });
  };

  // Execute Trash after user confirmation
  const executeTrashMessage = async () => {
    const msgId = confirmModal.targetId;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    if (!accessToken || !msgId) return;

    try {
      await trashGmailMessage(accessToken, msgId);
      setStatusMessage({
        type: 'success',
        text: 'Message moved to Gmail Trash.',
      });
      setMessageDetail(null);
      setActiveMessageId(null);
      loadInbox('');
    } catch (err: any) {
      if (isGoogleAuthExpired(err)) {
        console.warn('[GmailPanel] Google session expired.');
        onSignOut();
        setStatusMessage({
          type: 'error',
          text: 'Google Workspace session has expired. Please sign in with Google to reconnect.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Failed to delete message: ${err.message}`,
        });
      }
    }
  };

  // Populate SA 505 Confirmation template from selected Party ledger
  const handleSelectParty = (accountName: string) => {
    setSelectedPartyLedger(accountName);
    const ledger = partyLedgers.find((l) => l.accountName === accountName);
    if (!ledger) return;

    setSelectedTemplateId('balance_confirmation_request');
    const tmpl = CA_EMAIL_TEMPLATES.find((t) => t.id === 'balance_confirmation_request');
    if (!tmpl) return;

    const balanceAmt = Math.abs(ledger.netBalance).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
    });
    const balanceType = ledger.netBalance >= 0 ? 'Dr (Debit)' : 'Cr (Credit)';

    const html = tmpl.generateHtml(config, balanceSheet, profitAndLoss, {
      partyName: ledger.accountName,
      balanceAmount: `₹${balanceAmt}`,
      balanceType,
    });

    setSubject(`Audit Balance Confirmation Request as of ${config.reportingPeriod} — ${ledger.accountName}`);
    setBodyHtml(html);
    if (partyEmail) {
      setToEmail(partyEmail);
    }
    setSubTab('compose');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Google Account Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-400/40 text-red-400 flex items-center justify-center shadow-xs shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Gmail Audit &amp; Client Communication Hub</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                Draft, review, and send ICAI Financial Statements, Balance Confirmations (SA 505), and Audit Queries directly through your Gmail account with user permission.
              </p>
            </div>
          </div>

          {/* Account Status / Sign In / Sign Out */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            {accessToken && (user || profile) ? (
              <div className="flex items-center gap-3 bg-slate-800/90 border border-slate-700 px-3.5 py-2 rounded-xl">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-emerald-400 shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {(profile?.emailAddress || user?.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span>{user?.displayName || 'Google Account'}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                    {profile?.emailAddress || user?.email}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Disconnect Gmail"
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-rose-300 transition ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Official Styled Sign in with Google Button as mandated by skill */
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs shadow-md border border-slate-300 transition disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{isSigningIn ? 'Connecting Gmail...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center justify-between border-b transition ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Sub Navigation */}
        <div className="px-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex space-x-2 py-2 text-xs">
            <button
              onClick={() => setSubTab('compose')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition ${
                subTab === 'compose'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5 text-emerald-600" />
              <span>Compose CA Dispatch</span>
            </button>

            <button
              onClick={() => {
                setSubTab('inbox');
                if (accessToken && messages.length === 0) {
                  loadInbox('');
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition ${
                subTab === 'inbox'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Inbox className="w-3.5 h-3.5 text-blue-600" />
              <span>Gmail Communications ({messages.length})</span>
            </button>

            <button
              onClick={() => setSubTab('confirmations')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition ${
                subTab === 'confirmations'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>SA 505 Balance Confirmations ({partyLedgers.length})</span>
            </button>
          </div>

          {accessToken && (
            <button
              onClick={loadProfileAndInbox}
              disabled={profileLoading || inboxLoading}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium px-2.5 py-1 rounded-md hover:bg-slate-200 transition"
              title="Refresh Gmail data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${profileLoading || inboxLoading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* SubTab 1: Compose CA Dispatch */}
      {subTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Selection & Target Entity Details */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Active Client Entity
              </h3>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900 text-sm">{config.entityName || 'No Entity Loaded'}</div>
                <div className="text-slate-500">{config.entityType} • FY {config.financialYear}</div>
                <div className="text-slate-500">Period ending: {config.reportingPeriod}</div>
                {balanceSheet && (
                  <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between text-slate-700 font-medium">
                    <span>Balance Sheet Total:</span>
                    <span className="font-bold text-emerald-700">
                      ₹{balanceSheet.totalEquityAndLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {profitAndLoss && (
                  <div className="flex justify-between text-slate-700 font-medium">
                    <span>Net Profit / (Loss):</span>
                    <span className={`font-bold ${profitAndLoss.profitAfterTax >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      ₹{profitAndLoss.profitAfterTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Template Selector Cards */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                CA Statutory Email Templates
              </h3>
              <div className="space-y-2">
                {CA_EMAIL_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`w-full text-left p-3 rounded-xl border transition text-xs flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-500 text-emerald-950'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          isSelected ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{tmpl.title}</div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {tmpl.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compliance Info Card */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ICAI Non-Corporate Guidelines
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Transmittal templates automatically align with ICAI Technical Guide schedules (Notes 1 to 25) and standard audit confirmation requisitions.
              </p>
            </div>
          </div>

          {/* Right Column: Email Composer & Formatted HTML Preview */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  Dispatch Email via Gmail
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showHtmlPreview ? 'Edit Source HTML' : 'View Formatted Preview'}</span>
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <label className="sm:col-span-2 font-semibold text-slate-700">To (Client / Party):</label>
                  <div className="sm:col-span-10">
                    <input
                      type="email"
                      value={toEmail}
                      onChange={(e) => setToEmail(e.target.value)}
                      placeholder="e.g. client@entity.com, partner@rrk.in"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <label className="sm:col-span-2 font-semibold text-slate-700">Cc / Bcc:</label>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={ccEmail}
                      onChange={(e) => setCcEmail(e.target.value)}
                      placeholder="Cc: audit.team@firm.com"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={bccEmail}
                      onChange={(e) => setBccEmail(e.target.value)}
                      placeholder="Bcc: archive@firm.com"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <label className="sm:col-span-2 font-semibold text-slate-700">Subject:</label>
                  <div className="sm:col-span-10">
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    />
                  </div>
                </div>

                {/* Email Body / Preview */}
                <div className="pt-2">
                  <div className="font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Email Content:</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      {showHtmlPreview ? 'Live Formatted HTML Preview' : 'Raw HTML Editor'}
                    </span>
                  </div>

                  {showHtmlPreview ? (
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 min-h-[300px] max-h-[480px] overflow-y-auto">
                      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
                    </div>
                  ) : (
                    <textarea
                      value={bodyHtml}
                      onChange={(e) => setBodyHtml(e.target.value)}
                      rows={14}
                      className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    />
                  )}
                </div>

                {/* Action Bar */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>An explicit confirmation dialog will be presented before sending.</span>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isDrafting || isSending || !accessToken}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition disabled:opacity-50"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isDrafting ? 'Saving Draft...' : 'Save Draft in Gmail'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={triggerSendEmail}
                      disabled={isSending || isDrafting || !accessToken}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSending ? 'Sending via Gmail...' : 'Send via Gmail'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Gmail Communications & Inbox */}
      {subTab === 'inbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Messages List & Search */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Inbox className="w-3.5 h-3.5 text-blue-600" />
                  Recent Audit Communications
                </h3>
                <span className="text-[11px] text-slate-500">
                  {messages.length} messages
                </span>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') loadInbox(searchQuery);
                    }}
                    placeholder="Search Gmail (e.g. audit, statement, client)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <button
                  onClick={() => loadInbox(searchQuery)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
                >
                  Search
                </button>
              </div>

              {/* Quick filter presets */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {['', 'audit', 'financial statements', 'confirmation', 'tax'].map((q) => (
                  <button
                    key={q || 'all'}
                    onClick={() => {
                      setSearchQuery(q);
                      loadInbox(q);
                    }}
                    className={`px-2.5 py-1 rounded-md border transition ${
                      searchQuery === q
                        ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {q ? q : 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages List */}
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs max-h-[600px] overflow-y-auto">
              {inboxLoading ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600" />
                  <p>Loading Gmail messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-700">No emails found.</p>
                  <p className="text-[11px]">
                    {!accessToken ? 'Sign in with Google to view your Gmail inbox.' : 'Try a different search query or refresh.'}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelected = activeMessageId === msg.id;
                  return (
                    <button
                      key={msg.id}
                      onClick={() => handleSelectMessage(msg.id)}
                      className={`w-full text-left p-3.5 transition flex items-start justify-between gap-3 text-xs ${
                        isSelected
                          ? 'bg-blue-50/80 border-l-4 border-blue-600 text-blue-950 font-medium'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold truncate text-slate-900">
                            {msg.from.replace(/<.*>/, '').trim() || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {msg.date ? new Date(msg.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''}
                          </span>
                        </div>
                        <div className="font-medium text-slate-800 truncate">{msg.subject}</div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{msg.snippet}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-2" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Email Detail Viewer */}
          <div className="lg:col-span-7 space-y-4">
            {detailLoading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500 space-y-2 shadow-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p>Retrieving message body from Gmail...</p>
              </div>
            ) : messageDetail ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {messageDetail.subject}
                    </h3>
                    <div className="text-xs text-slate-600 flex flex-col gap-0.5 pt-1">
                      <div>
                        <span className="font-semibold text-slate-700">From: </span>
                        <span>{messageDetail.from}</span>
                      </div>
                      {messageDetail.to && (
                        <div>
                          <span className="font-semibold text-slate-700">To: </span>
                          <span>{messageDetail.to}</span>
                        </div>
                      )}
                      {messageDetail.cc && (
                        <div>
                          <span className="font-semibold text-slate-700">Cc: </span>
                          <span>{messageDetail.cc}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400">
                        {messageDetail.date}
                      </div>
                    </div>
                  </div>

                  {/* Message Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        // Reply: set toEmail and subject
                        const replyTo = messageDetail.from.match(/<([^>]+)>/)?.[1] || messageDetail.from;
                        setToEmail(replyTo);
                        setSubject(
                          messageDetail.subject.startsWith('Re:')
                            ? messageDetail.subject
                            : `Re: ${messageDetail.subject}`
                        );
                        setSubTab('compose');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold text-xs transition"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => triggerTrashMessage(messageDetail.id)}
                      title="Move to Trash"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="text-xs text-slate-800 leading-relaxed min-h-[300px] max-h-[500px] overflow-y-auto p-4 bg-slate-50/60 rounded-xl border border-slate-100">
                  {messageDetail.bodyHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: messageDetail.bodyHtml }} />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-xs">{messageDetail.bodyText}</pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500 space-y-2 shadow-xs">
                <Mail className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-700 text-sm">Select an email to read</p>
                <p className="text-[11px] max-w-sm mx-auto text-slate-400">
                  Select any audit query, client transmittal, or confirmation thread from the list on the left to view the full details.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 3: SA 505 External Balance Confirmation Dispatcher */}
      {subTab === 'confirmations' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                SA 505 External Balance Confirmation Dispatcher
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically draft and dispatch balance confirmation letters for Trade Debtors, Creditors, and Bank accounts.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 self-start sm:self-center">
              {partyLedgers.length} Confirmable Ledgers Found
            </span>
          </div>

          {partyLedgers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <Building2 className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700">No Debtors, Creditors, or Bank ledgers available</p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Ingest or map a Trial Balance with ledgers under Note 10 (Trade Receivables), Note 11 (Cash &amp; Bank), or Note 16 (Trade Payables) to use this tool.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Schedule</th>
                      <th className="px-4 py-3">Ledger / Party Name</th>
                      <th className="px-4 py-3 text-right">Closing Balance</th>
                      <th className="px-4 py-3 text-center">Type</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {partyLedgers.map((item) => (
                      <tr key={item.accountName} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                          Note {item.noteNumber}: {item.noteName}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.accountName}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                          ₹{Math.abs(item.netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.netBalance >= 0
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {item.netBalance >= 0 ? 'Dr' : 'Cr'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleSelectParty(item.accountName)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Prepare SA 505 Confirmation</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODAL (Skill requirement) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {confirmModal.actionType === 'send'
                    ? 'Confirm Email Dispatch via Gmail'
                    : 'Confirm Moving Message to Trash'}
                </h3>
                <p className="text-xs text-slate-500">
                  {confirmModal.actionType === 'send'
                    ? 'This email will be dispatched directly from your authenticated Gmail account.'
                    : 'This email message will be moved to the Gmail trash folder.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
              {confirmModal.actionType === 'send' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sender:</span>
                    <span className="font-semibold text-slate-800">
                      {profile?.emailAddress || user?.email || 'Authenticated User'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recipient (To):</span>
                    <span className="font-bold text-slate-900">{confirmModal.details?.to}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subject:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[280px]">
                      {confirmModal.details?.subject}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Associated Client:</span>
                    <span className="font-semibold text-emerald-800">{config.entityName}</span>
                  </div>
                </>
              ) : (
                <div>
                  <span className="text-slate-500">Subject: </span>
                  <span className="font-semibold text-slate-800">{confirmModal.details?.subject}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmModal.actionType === 'send' ? executeSendEmail : executeTrashMessage}
                className={`px-4 py-2 rounded-xl text-white font-semibold text-xs shadow-md transition flex items-center gap-1.5 ${
                  confirmModal.actionType === 'send'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmModal.actionType === 'send' ? (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Yes, Send Email</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Move to Trash</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
