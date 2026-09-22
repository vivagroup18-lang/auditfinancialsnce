import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  Building2,
  Scale,
  Calendar,
  X,
  Check,
  Download,
  ExternalLink,
} from 'lucide-react';
import {
  hasAcceptedTerms,
  recordTermsAccepted,
  getTermsAcceptedInfo,
  CURRENT_TERMS_VERSION,
} from '../utils/storageManager';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onClose?: () => void;
  isMandatory?: boolean; // If true, user cannot dismiss without accepting
}

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  isOpen,
  onAccept,
  onClose,
  isMandatory = false,
}) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [acceptedInfo, setAcceptedInfo] = useState<{
    accepted: boolean;
    version?: string;
    acceptedAt?: string;
  }>(() => getTermsAcceptedInfo());

  useEffect(() => {
    if (isOpen) {
      const info = getTermsAcceptedInfo();
      setAcceptedInfo(info);
      if (info.accepted) {
        setIsChecked(true);
      } else {
        setIsChecked(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 40) {
      setHasScrolledToBottom(true);
    }
  };

  const handleConfirmAccept = () => {
    if (!isChecked) return;
    recordTermsAccepted(CURRENT_TERMS_VERSION);
    onAccept();
    if (onClose) onClose();
  };

  const formattedAcceptedDate = acceptedInfo.acceptedAt
    ? new Date(acceptedInfo.acceptedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="terms-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Terms of Service &amp; Professional Disclaimer
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  v{CURRENT_TERMS_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Statutory Non-Corporate Entity (NCE) Audit &amp; Financial Statements Preparation Platform
              </p>
            </div>
          </div>

          {!isMandatory && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Existing Acceptance Banner (if reviewing) */}
        {acceptedInfo.accepted && formattedAcceptedDate && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-900 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Terms Previously Accepted:</strong> You confirmed these terms on {formattedAcceptedDate}.
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              Active Agreement
            </span>
          </div>
        )}

        {/* Mandatory Warning Notice */}
        {isMandatory && !acceptedInfo.accepted && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-900 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Mandatory Acknowledgment:</strong> Please read and accept the professional accounting disclaimer below to proceed into the audit workspace.
            </span>
          </div>
        )}

        {/* Scrollable Terms Content */}
        <div
          onScroll={handleScroll}
          className="px-5 sm:px-7 py-5 overflow-y-auto text-slate-700 text-xs sm:text-[13px] leading-relaxed space-y-5 divide-y divide-slate-100 flex-1"
        >
          {/* Section 1 */}
          <div className="space-y-2 pt-1 first:pt-0">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>1. Software Purpose &amp; Regulatory Framework</span>
            </div>
            <p>
              This application (<strong>"AuditFinancials"</strong>) is specialized professional software engineered to assist Chartered Accountants, Tax Auditors, financial practitioners, and accountants in compiling statutory financial statements (Balance Sheet, Profit and Loss Account, Partner Capital Accounts, and ICAI Note Schedules 1 to 25) for <strong>Non-Corporate Entities (NCEs)</strong>—including Sole Proprietorships, Partnership Firms, and Limited Liability Partnerships (LLPs).
            </p>
            <p className="text-slate-600">
              The compilation logic adheres strictly to the <em>Technical Guide on Financial Statements of Non-Corporate Entities</em> issued by the <strong>Institute of Chartered Accountants of India (ICAI)</strong> and reporting requirements under Section 44AB of the Income Tax Act, 1961.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2 pt-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>2. Chartered Accountant Diligence &amp; Statutory Responsibility</span>
            </div>
            <p>
              The user expressly recognizes and agrees that this platform functions solely as an <strong>algorithmic and computational compilation aid</strong>. 
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-slate-800">
              <p className="font-semibold text-slate-900">The Practicing Chartered Accountant / Signing Auditor remains solely responsible for:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                <li>Independent verification, vouching, and corroboration of client books of accounts and ledger balances.</li>
                <li>Ensuring compliance with applicable ICAI Accounting Standards (AS 1 through AS 29) applicable to Non-Corporate Entities.</li>
                <li>Verifying statutory disclosures, depreciation calculations under the Income Tax Act, and related-party disclosures.</li>
                <li>Final review, signing, UDIN generation, and certification of the compiled audit reports, Balance Sheets, and tax audit forms.</li>
              </ul>
            </div>
            <p className="text-slate-600">
              The platform does not render statutory audit opinions, certification, or legal assurances. Automated generation of statements does not substitute for the professional skepticism and due diligence required under ICAI Standards on Auditing (SAs).
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-2 pt-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>3. Data Privacy, Local-First Storage &amp; Cloud Synchronization</span>
            </div>
            <p>
              We maintain strict client confidentiality protocols aligned with professional ethics:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li><strong>Local-First Architecture:</strong> All parsing of Excel/CSV trial balances and financial statement computations execute locally inside your web browser. Your client data is persisted directly in your browser's private local storage.</li>
              <li><strong>Google Drive Cloud Sync:</strong> If you connect Google Workspace, backups are encrypted and saved solely into a dedicated folder (<code>CA Financial Statement Backups</code>) in your own Google Drive. The application does not upload or retain your accounting data on external third-party proprietary servers.</li>
              <li><strong>Zero Data Monetization:</strong> We do not sell, rent, scrape, aggregate, or expose client financial information, PANs, GSTINs, or turnover records to any advertising or commercial entities.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-2 pt-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>4. AI-Assisted Mapping &amp; Automated Classifications</span>
            </div>
            <p>
              Where AI or machine-assisted mapping (Gemini / Google AI) is utilized for matching Trial Balance accounts with ICAI Note Schedules, such classifications represent <strong>assistive suggestions</strong> based on account titles and standard Indian accounting nomenclature.
            </p>
            <p className="text-slate-600">
              The user is required to review all mapped schedules in Step 1 (Current Year), Step 2 (Previous Year), and Step 4 (Notes &amp; Audit) to confirm appropriateness prior to report export.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-2 pt-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Scale className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>5. Limitation of Liability &amp; Warranty Disclaimer</span>
            </div>
            <p>
              This software is provided on an <strong>"AS IS" and "AS AVAILABLE"</strong> basis without warranties of any kind, whether express or implied.
            </p>
            <p className="text-slate-600">
              To the maximum extent permitted by applicable law, the developers, contributors, and platform operators shall not be liable for any direct, indirect, incidental, punitive, or consequential damages—including but not limited to tax penalties, interest levies, disallowances under Section 40(a)(ia) / 43B, audit disputes, loss of client goodwill, or hardware/browser cache data loss.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-2 pt-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>6. Recommended Backup Best Practices</span>
            </div>
            <p>
              Because browser storage can be cleared by browser updates or disk cleanup utilities, users are strongly advised to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li>Regularly use the <strong>"Total Local Backup (.json)"</strong> button to store an offline JSON copy on your computer drive.</li>
              <li>Keep Google Drive Auto-Sync active to facilitate automatic restoration across different laptops and computers.</li>
              <li>Export and retain final certified financial statements in Excel (<code>.xlsx</code>) format for office documentation and peer review records.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer / Acceptance Controls */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-3">
          {/* Checkbox Acknowledgment */}
          <label className="flex items-start gap-3 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
            />
            <span className="text-xs text-slate-800 leading-snug group-hover:text-slate-900">
              <strong>I confirm that I am a Chartered Accountant, tax auditor, accounting professional, or authorized entity representative.</strong> I have read, understood, and agree to the Terms of Service, Professional Disclaimer, and Data Confidentiality Policies.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Governed by Indian Law &amp; Professional Standards</span>
            </div>

            <div className="flex items-center gap-2 justify-end">
              {!isMandatory && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Close
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmAccept}
                disabled={!isChecked}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{acceptedInfo.accepted ? 'Confirm & Continue' : 'Accept & Enter Workspace'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
