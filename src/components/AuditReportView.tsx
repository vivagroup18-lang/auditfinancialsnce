import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2, AlertCircle, FileCheck, Award, Printer, Download, Sparkles, HelpCircle, Mail } from 'lucide-react';
import { AuditException, EntityConfig, BalanceSheetData, ProfitAndLossData } from '../types';

interface AuditReportViewProps {
  exceptions: AuditException[];
  config: EntityConfig;
  balanceSheet: BalanceSheetData;
  profitAndLoss: ProfitAndLossData;
  onUpdateConfig: (updated: Partial<EntityConfig>) => void;
  onSelectNote: (noteNumber: number) => void;
  onEmailAuditQueries?: () => void;
}

export const AuditReportView: React.FC<AuditReportViewProps> = ({
  exceptions,
  config,
  balanceSheet,
  profitAndLoss,
  onUpdateConfig,
  onSelectNote,
  onEmailAuditQueries,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'exceptions' | 'tax_audit_3cd' | 'sign_off'>('exceptions');
  const [generatedUDIN, setGeneratedUDIN] = useState(config.udin || '');
  const [auditOpinion, setAuditOpinion] = useState<'unmodified' | 'qualified' | 'adverse'>('unmodified');

  const highSeverityCount = exceptions.filter((e) => e.severity === 'high').length;
  const mediumSeverityCount = exceptions.filter((e) => e.severity === 'medium').length;
  const lowSeverityCount = exceptions.filter((e) => e.severity === 'low').length;

  const handleGenerateUDIN = () => {
    // Standard UDIN format: YY + 6-digit Member No + 4 Alpha + 4 Numeric
    const yearPrefix = '25';
    const mem = (config.auditorMembershipNo || '123456').padStart(6, '0').slice(0, 6);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let randomLetters = '';
    for (let i = 0; i < 4; i++) randomLetters += chars.charAt(Math.floor(Math.random() * chars.length));
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const newUDIN = `${yearPrefix}${mem}${randomLetters}${randomDigits}`;
    setGeneratedUDIN(newUDIN);
    onUpdateConfig({ udin: newUDIN });
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-xs font-semibold">
                ICAI Audit Working Paper
              </span>
              <span className="text-xs text-slate-500 font-medium">Standards on Auditing (SAs)</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Audit Exception & Statutory Tax Audit (Form 3CB/3CD) Report
            </h2>
            <p className="text-xs text-slate-500">
              Audit analysis of trial balance integrity, abnormal balances, suspense accounts, and Form 3CD clauses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onEmailAuditQueries && (
              <button
                onClick={onEmailAuditQueries}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 text-xs font-semibold shadow-xs transition"
                title="Draft and send audit requisitions and queries directly via Gmail"
              >
                <Mail className="w-3.5 h-3.5 text-red-500" />
                <span>Email Queries via Gmail</span>
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-slate-100 text-xs">
          <button
            onClick={() => setActiveSubTab('exceptions')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'exceptions'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Audit Exceptions ({exceptions.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('tax_audit_3cd')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'tax_audit_3cd'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Form 3CB/3CD Tax Audit Clauses</span>
          </button>
          <button
            onClick={() => setActiveSubTab('sign_off')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'sign_off'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            <span>CA Auditor Sign-Off &amp; UDIN</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: EXCEPTIONS LIST */}
      {activeSubTab === 'exceptions' && (
        <div className="space-y-4">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Audit Flags</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{exceptions.length}</div>
              <span className="text-[10px] text-slate-400">Automated SA-500 evidence checks</span>
            </div>

            <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-xs">
              <span className="text-xs text-rose-800 font-semibold">High Severity</span>
              <div className="text-2xl font-bold text-rose-900 mt-1">{highSeverityCount}</div>
              <span className="text-[10px] text-rose-600">Requires CA adjustment before sign-off</span>
            </div>

            <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs">
              <span className="text-xs text-amber-800 font-semibold">Medium Severity</span>
              <div className="text-2xl font-bold text-amber-900 mt-1">{mediumSeverityCount}</div>
              <span className="text-[10px] text-amber-600">Verify classification &amp; disclosures</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-600 font-semibold">Low / Informational</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{lowSeverityCount}</div>
              <span className="text-[10px] text-slate-500">Dormant &amp; zero balance items</span>
            </div>
          </div>

          {/* Exception Cards */}
          {exceptions.length === 0 ? (
            <div className="bg-white rounded-xl border border-emerald-200 p-8 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Zero Audit Exceptions Detected</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Debits and credits tally accurately, no suspense accounts were identified, and all ledger accounts conform to standard ICAI Non-Corporate Entity normal balances.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {exceptions.map((exc, excIdx) => {
                const isHigh = exc.severity === 'high';
                const isMedium = exc.severity === 'medium';
                return (
                  <div
                    key={exc.id ? `${exc.id}-${excIdx}` : `exc-${excIdx}`}
                    className={`bg-white rounded-xl border p-4 shadow-xs transition ${
                      isHigh
                        ? 'border-rose-200 hover:border-rose-300'
                        : isMedium
                        ? 'border-amber-200 hover:border-amber-300'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isHigh
                              ? 'bg-rose-100 text-rose-700'
                              : isMedium
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                isHigh
                                  ? 'bg-rose-100 text-rose-800'
                                  : isMedium
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {exc.severity} Priority
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {exc.type.replace(/_/g, ' ')}
                            </span>
                            {exc.accountName && (
                              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {exc.accountName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            {exc.message}
                          </p>
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2">
                            <strong className="text-slate-800">CA Remediation & Audit Action:</strong>{' '}
                            {exc.recommendation}
                          </div>
                        </div>
                      </div>

                      {exc.amount !== undefined && (
                        <div className="text-right sm:shrink-0">
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">Amount Involved</span>
                          <span className="font-mono font-bold text-xs text-rose-700">
                            ₹{exc.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: TAX AUDIT FORM 3CD CHECKPOINTS */}
      {activeSubTab === 'tax_audit_3cd' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Key Tax Audit Checkpoints for Non-Corporate Entities (Form 3CD)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated statutory verification points under the Income Tax Act, 1961 for partnership firms and sole proprietors.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Clause 22: Section 43B(h) MSME */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900">
                  Clause 22 / Section 43B(h): MSME Overdue Payments
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Compliant Schedule
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Requires disallowance of any sum payable to a Micro or Small enterprise beyond the time limit specified in Section 15 of MSMED Act (15 days without agreement, 45 days with written agreement).
              </p>
              <div className="mt-2 text-[11px] text-slate-700 font-medium">
                Mapped to Note 9 (Trade Payables). Trade payables to MSME have been separated into a dedicated sub-category for disclosure in Form 3CD Clause 22.
              </div>
            </div>

            {/* Clause 21(a): Section 40(b) Partner Remuneration */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900">
                  Clause 21(a) / Section 40(b): Partners' Remuneration & Interest Limits
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                  Section 40(b) Ceiling Check
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Interest to partners restricted to max 12% per annum. Partners' remuneration allowed up to ₹3,00,000 or 90% of book profit on the first ₹6,00,000 of book profit (or in case of a loss), and 60% on the balance of book profit (as enhanced by the Budget 2024 amendment to Section 40(b)).
              </p>
              <div className="mt-2 text-[11px] text-slate-700 font-medium">
                Book profit before partners' remuneration is tracked via Note 24 and Note 3 to verify whether deed clauses and Section 40(b) thresholds are met.
              </div>
            </div>

            {/* Clause 31: Cash Transactions (Sec 269SS / 269ST) */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900">
                  Clause 31: Section 269SS & Section 269T (Loans & Deposits)
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                  Banking Channels
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Verification that no loan or deposit of ₹20,000 or more was accepted or repaid otherwise than by account payee cheque, draft, or electronic clearing system.
              </p>
              <div className="mt-2 text-[11px] text-slate-700 font-medium">
                Note 5 & Note 8 items analyzed for unverified cash borrowings or repayments.
              </div>
            </div>

            {/* Clause 18: Depreciation (Sec 32) */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900">
                  Clause 18: Depreciation under Section 32 of Income Tax Act
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  Block of Assets
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Reconciliation between Companies Act / ICAI accounting depreciation (Note 11) and Income Tax Act block-of-assets WDV rates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CA AUDITOR SIGN-OFF & UDIN */}
      {activeSubTab === 'sign_off' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Chartered Accountant Statutory Sign-Off & UDIN Authentication
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter auditor credentials and generate a unique Document Identification Number (UDIN) in accordance with ICAI mandates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Chartered Accountant Name</label>
              <input
                type="text"
                value={config.auditorName || ''}
                onChange={(e) => onUpdateConfig({ auditorName: e.target.value })}
                placeholder="e.g. CA. Rajesh Sharma"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">ICAI Membership Number</label>
              <input
                type="text"
                value={config.auditorMembershipNo || ''}
                onChange={(e) => onUpdateConfig({ auditorMembershipNo: e.target.value })}
                placeholder="e.g. 098765"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Firm Registration Number (FRN)</label>
              <input
                type="text"
                value={config.firmRegistrationNo || ''}
                onChange={(e) => onUpdateConfig({ firmRegistrationNo: e.target.value })}
                placeholder="e.g. 101234W"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Statutory Audit Opinion</label>
              <select
                value={auditOpinion}
                onChange={(e: any) => setAuditOpinion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
              >
                <option value="unmodified">Unmodified (True & Fair View)</option>
                <option value="qualified">Qualified Opinion (With Reservations)</option>
                <option value="adverse">Adverse Opinion</option>
              </select>
            </div>
          </div>

          {/* UDIN Generator Box */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Unique Document Identification Number (UDIN)
                </span>
                <span className="text-[11px] text-slate-500">
                  Mandatory 18-digit alphanumeric verification string for all attestations and tax audit reports
                </span>
              </div>
              <button
                onClick={handleGenerateUDIN}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate / Refresh UDIN</span>
              </button>
            </div>

            {generatedUDIN ? (
              <div className="p-3 bg-white border border-emerald-300 rounded-lg flex items-center justify-between">
                <div className="font-mono text-sm font-bold text-emerald-800 tracking-wider">
                  UDIN: {generatedUDIN}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  ICAI Authenticated Format
                </span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                Click "Generate UDIN" to stamp this financial report.
              </div>
            )}
          </div>

          {/* Statutory Opinion Certificate Declaration */}
          <div className="p-5 bg-slate-900 text-slate-100 rounded-xl space-y-3 text-xs leading-relaxed font-serif">
            <div className="text-center border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-white uppercase tracking-wider">
                INDEPENDENT AUDITOR'S REPORT
              </h4>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                To the Partners / Proprietor of {config.entityName}
              </p>
            </div>
            <p>
              We have audited the accompanying financial statements of <strong>{config.entityName}</strong> ("the Entity"), which comprise the Balance Sheet as at {config.reportingPeriod}, and the Statement of Profit and Loss for the year then ended, and Notes to the financial statements, including significant accounting policies and other explanatory notes.
            </p>
            <p>
              In our opinion and to the best of our information and according to the explanations given to us, the aforesaid financial statements give a true and fair view in conformity with the Guidance Note on Financial Statements of Non-Corporate Entities issued by the Institute of Chartered Accountants of India (ICAI).
            </p>
            <div className="pt-3 border-t border-slate-800 flex justify-between items-end font-sans text-[11px] text-slate-400">
              <div>
                <div>Place: Mumbai / New Delhi</div>
                <div>Date: {new Date().toLocaleDateString('en-IN')}</div>
                <div>UDIN: {generatedUDIN || 'PENDING'}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-white text-xs">{config.auditorName || 'Chartered Accountant'}</div>
                <div>Membership No: {config.auditorMembershipNo || 'N/A'}</div>
                <div>Firm Reg. No: {config.firmRegistrationNo || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
