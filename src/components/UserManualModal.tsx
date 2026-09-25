import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  X,
  Printer,
  Sparkles,
  Bot,
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Layers,
  Users,
  Coins,
  Cloud,
  FileCheck,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Scale,
  Building,
  ArrowRight
} from 'lucide-react';

export interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAICopilot?: (prompt?: string) => void;
  onNavigateStep?: (step: number) => void;
}

type SectionKey =
  | 'overview'
  | 'workflow'
  | 'icai-framework'
  | 'trial-balance'
  | 'schedules'
  | 'partner-capital'
  | 'msme'
  | 'adjustments'
  | 'cloud-sync'
  | 'tax-audit'
  | 'faq';

interface ManualSection {
  id: SectionKey;
  title: string;
  badge?: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  onOpenAICopilot,
  onNavigateStep,
}) => {
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const sections: ManualSection[] = useMemo(
    () => [
      {
        id: 'overview',
        title: 'Platform Overview',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
        content: (
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-6 rounded-2xl border border-emerald-500/30">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ICAI Non-Corporate Entity Standard Compliance
              </span>
              <h2 className="text-2xl font-bold text-white mt-3">
                AuditFinancials Operating Manual &amp; CA Guide
              </h2>
              <p className="text-slate-300 mt-2 text-sm">
                Engineered specifically for Indian Chartered Accountants, audit practitioners, and accounting professionals
                preparing statutory financial statements for Non-Corporate Entities (Sole Proprietorships, Partnership Firms, LLPs, AOPs, BOIs, Societies, and Trusts)
                under the <strong>ICAI Guidance Note on Financial Statements of Non-Corporate Entities</strong>.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSection('workflow')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Explore 5-Step Workflow</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {onOpenAICopilot && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAICopilot('How do I start preparing a partnership firm financial statement?');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Ask AI CA Copilot</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span>Statutory Taxonomy</span>
                </div>
                <p className="text-xs text-slate-600">
                  Full adherence to ICAI Technical Guide: Schedule III-like format customized for Non-Corporate Entities (Notes 1 to 28).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>AI Semantic Mapping</span>
                </div>
                <p className="text-xs text-slate-600">
                  Translates messy trial balance ledger names into statutory notes with 98%+ confidence, powered by Gemini 3.8 and statutory heuristics.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                  <Cloud className="w-4 h-4 text-teal-600" />
                  <span>Google Drive Privacy</span>
                </div>
                <p className="text-xs text-slate-600">
                  Zero retention on proprietary servers. All company databases are stored strictly inside the user's private Google Drive workspace.
                </p>
              </div>
            </div>

            <div className="border border-amber-200 bg-amber-50/70 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong className="font-bold">Applicability Notice:</strong> Non-Corporate Entities are mandated to comply with Accounting Standards formulated by the ICAI. This software standardizes presentation across Balance Sheet, Statement of Profit &amp; Loss, Statement of Changes in Equity, and Notes to Accounts for direct inclusion in Tax Audit Reports (Form 3CB/3CD) and statutory certifications.
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'workflow',
        title: '5-Step Workflow',
        badge: 'Core Guide',
        icon: <Layers className="w-4 h-4 text-blue-500" />,
        content: (
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
            <h3 className="text-lg font-bold text-slate-900">
              End-to-End Audit &amp; Financial Preparation Workflow
            </h3>
            <p className="text-xs text-slate-600">
              Follow these 5 streamlined steps to take any client firm from raw Trial Balance to finalized, tallied, and audit-ready financial statements:
            </p>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Company Profile &amp; Current Year Trial Balance
                    </h4>
                  </div>
                  {onNavigateStep && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateStep(1);
                      }}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Go to Step 1</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <ul className="list-disc list-inside mt-2.5 space-y-1.5 text-xs text-slate-700 pl-1">
                  <li>Select or register the Client Entity (Partnership Firm, Sole Proprietor, LLP, Society, Trust).</li>
                  <li>Upload the Current Year Trial Balance (Excel, CSV, or paste values).</li>
                  <li>Verify the Trial Balance status: Debits must equal Credits (green badge).</li>
                  <li>Review AI semantic mapping: click <strong>"AI Mapping"</strong> to automatically categorize all ledger accounts into statutory Notes 3 to 25.</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Previous Year Comparatives (PY)
                    </h4>
                  </div>
                  {onNavigateStep && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateStep(2);
                      }}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Go to Step 2</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <ul className="list-disc list-inside mt-2.5 space-y-1.5 text-xs text-slate-700 pl-1">
                  <li>Upload prior year audited Trial Balance or carry forward last year's verified figures.</li>
                  <li>Auto-maps prior year figures with identical note schedules for accurate comparative disclosures.</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Comparative Financial Statements
                    </h4>
                  </div>
                  {onNavigateStep && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateStep(3);
                      }}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Go to Step 3</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <ul className="list-disc list-inside mt-2.5 space-y-1.5 text-xs text-slate-700 pl-1">
                  <li>Instant side-by-side comparative <strong>Balance Sheet</strong> (Assets = Liabilities).</li>
                  <li><strong>Statement of Profit and Loss</strong> with Operating Revenue, COGS, and Overheads.</li>
                  <li><strong>Statement of Changes in Equity</strong> tracking capital additions, interest, drawings, and share of profit.</li>
                  <li>Live Audit Diagnostics: identifies negative cash, unverified debit balances, and round-off discrepancies.</li>
                </ul>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center">
                      4
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Statutory Notes &amp; Year-End Adjustments
                    </h4>
                  </div>
                  {onNavigateStep && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateStep(4);
                      }}
                      className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Go to Step 4</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <ul className="list-disc list-inside mt-2.5 space-y-1.5 text-xs text-slate-700 pl-1">
                  <li>Detailed note schedules (Notes 1 to 28) with itemized ledger listings.</li>
                  <li><strong>Partner Capital &amp; Remuneration Engine</strong>: Computes Section 40(b) ceiling limits on book profits.</li>
                  <li><strong>MSME Trade Payables aging</strong>: Micro, Small &amp; Medium enterprise overdue interest calculations.</li>
                  <li><strong>Year-End Adjustments</strong>: Closing stock valuation (AS-2), prepaid expenses, and depreciation entries.</li>
                </ul>
              </div>

              {/* Step 5 */}
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                      5
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Export &amp; Statutory Audit Reports
                    </h4>
                  </div>
                  {onNavigateStep && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateStep(5);
                      }}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Go to Step 5</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <ul className="list-disc list-inside mt-2.5 space-y-1.5 text-xs text-slate-700 pl-1">
                  <li>1-Click multi-tab Excel Workbook (`.xlsx`) formatted with professional cell styling, print areas, and formula linkages.</li>
                  <li>Generate standalone printable PDF Financial Reports with UDIN and CA sign-off blocks.</li>
                  <li>Direct attachment ready for Income Tax Return (ITR-5 / ITR-7) and Form 3CB/3CD Tax Audits.</li>
                </ul>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'icai-framework',
        title: 'ICAI Standards & Entity Levels',
        badge: 'Statutory',
        icon: <Scale className="w-4 h-4 text-amber-500" />,
        content: (
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
            <h3 className="text-lg font-bold text-slate-900">
              ICAI Criteria for Classification of Non-Corporate Entities
            </h3>
            <p className="text-xs text-slate-600">
              The Institute of Chartered Accountants of India (ICAI) classifies non-corporate entities (Partnerships, Proprietorships, LLPs, HUFs, AOPs) into 4 distinct levels for applicability of Accounting Standards:
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="p-3 border-b border-slate-200">Entity Level</th>
                    <th className="p-3 border-b border-slate-200">Turnover Threshold</th>
                    <th className="p-3 border-b border-slate-200">Borrowings Threshold</th>
                    <th className="p-3 border-b border-slate-200">Accounting Standard Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">Level I (Large)</td>
                    <td className="p-3">&gt; ₹250 Crores</td>
                    <td className="p-3">&gt; ₹50 Crores</td>
                    <td className="p-3 text-slate-600">All Accounting Standards apply in full without exemptions.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">Level II (Medium)</td>
                    <td className="p-3">₹50 Cr to ₹250 Cr</td>
                    <td className="p-3">₹10 Cr to ₹50 Cr</td>
                    <td className="p-3 text-slate-600">Partial exemptions in AS-3, AS-17, AS-20, AS-24.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">Level III (Small)</td>
                    <td className="p-3">₹10 Cr to ₹50 Cr</td>
                    <td className="p-3">₹2 Cr to ₹10 Cr</td>
                    <td className="p-3 text-slate-600">Exemptions in AS-3, AS-17, AS-18, AS-20, AS-24, AS-28.</td>
                  </tr>
                  <tr className="bg-emerald-50/50 hover:bg-emerald-50">
                    <td className="p-3 font-bold text-emerald-950">Level IV (Micro)</td>
                    <td className="p-3">&le; ₹10 Crores</td>
                    <td className="p-3">&le; ₹2 Crores</td>
                    <td className="p-3 text-emerald-900 font-semibold">
                      Maximum relaxations. AS-3 (Cash Flow) is exempt/optional. Relaxed disclosures.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                Key Standards Applicability Summary for Level IV Entities
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">AS-1 (Accounting Policies):</strong>
                    <p className="text-slate-500 text-[11px]">Mandatory disclosure of accrual, going concern, and consistency.</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">AS-2 (Valuation of Inventories):</strong>
                    <p className="text-slate-500 text-[11px]">Valued at lower of cost and net realizable value (FIFO or weighted average).</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">AS-10 (Property, Plant &amp; Equip):</strong>
                    <p className="text-slate-500 text-[11px]">Recorded at historical cost less accumulated depreciation.</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    X
                  </span>
                  <div>
                    <strong className="text-slate-800">AS-3 (Cash Flow Statement):</strong>
                    <p className="text-slate-500 text-[11px]">Not mandatory for Level IV entities (app provides it as an optional schedule).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'trial-balance',
        title: 'Trial Balance & Auto-Mapping',
        icon: <FileSpreadsheet className="w-4 h-4 text-emerald-500" />,
        content: (
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Trial Balance Upload Specifications &amp; Smart Mapping Engine
            </h3>
            <p className="text-xs text-slate-600">
              The application ingests Trial Balances exported from any accounting software (TallyPrime, Busy, Zoho Books, SAP, QuickBooks, or custom spreadsheets).
            </p>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2 text-xs">
              <h4 className="font-bold text-slate-800">Supported File Formats &amp; Structure:</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li><strong>File extensions:</strong> `.xlsx`, `.xls`, `.csv`, `.tsv`, or direct clipboard paste.</li>
                <li><strong>Required columns:</strong>
                  <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 text-[11px] text-slate-500">
                    <li>Ledger Account Name / Particulars</li>
                    <li>Debit Amount (or Net Closing Balance)</li>
                    <li>Credit Amount</li>
                    <li>(Optional) Group Name, Opening Balance, Account Code</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">How AI Semantic Mapping Works</h4>
              <p className="text-xs text-slate-600">
                Traditional rule engines fail when client accountants name ledgers non-standardly (e.g. <em>"SBI CC A/C 9912"</em>, <em>"Ramesh Goods Inward"</em>, <em>"TDS on Rent 194I"</em>).
                Our system uses a dual-engine approach:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Gemini 3.8 Semantic Engine</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Examines ledger semantics, debit/credit posture, and balance sheet context to recommend statutory schedule assignments with reasoning.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Deterministic ICAI Fallback Engine</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Guarantees 100% offline uptime with hundreds of ICAI regex rules ensuring zero downtime if network or API keys are unavailable.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
              <strong className="font-bold">Tally Mismatch Troubleshooting:</strong> If the Trial Balance indicates a difference between debits and credits, look for:
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-800 text-[11px]">
                <li>Missing Profit &amp; Loss opening balance ledger.</li>
                <li>Closing stock entered inside the trial balance instead of as a year-end adjustment.</li>
                <li>Opposite signage in single-column net balances (negative values treated as opposite nature).</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        id: 'schedules',
        title: 'Statutory Schedules (Notes 1-28)',
        icon: <BookOpen className="w-4 h-4 text-indigo-500" />,
        content: (
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
            <h3 className="text-lg font-bold text-slate-900">
              ICAI Non-Corporate Entity Statutory Notes Structure
            </h3>
            <p className="text-xs text-slate-600">
              The financial statements are built upon the standardized 28-schedule architecture recommended by the ICAI:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="font-black text-emerald-700 text-xs">EQUITY &amp; LIABILITIES</span>
                <ul className="mt-2 space-y-1.5 text-slate-600 text-[11px]">
                  <li><strong>Note 1:</strong> Entity Overview &amp; Nature of Business</li>
                  <li><strong>Note 2:</strong> Significant Accounting Policies (AS-1)</li>
                  <li><strong>Note 3:</strong> Owners' / Partners' Capital Accounts</li>
                  <li><strong>Note 4:</strong> Reserves and Surplus</li>
                  <li><strong>Note 5:</strong> Borrowings (Long-Term &amp; Short-Term)</li>
                  <li><strong>Note 6:</strong> Deferred Tax Liabilities / Assets (Net)</li>
                  <li><strong>Note 7:</strong> Other Long-Term Liabilities</li>
                  <li><strong>Note 8:</strong> Provisions (Long-Term &amp; Short-Term)</li>
                  <li><strong>Note 9:</strong> Trade Payables (with MSME aging)</li>
                  <li><strong>Note 10:</strong> Other Current Liabilities (GST/TDS/Salaries)</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="font-black text-blue-700 text-xs">ASSETS</span>
                <ul className="mt-2 space-y-1.5 text-slate-600 text-[11px]">
                  <li><strong>Note 11:</strong> Property, Plant &amp; Equipment (PPE)</li>
                  <li><strong>Note 12:</strong> Investments (Non-Current &amp; Current)</li>
                  <li><strong>Note 13:</strong> Loans and Advances (Security Deposits, TDS)</li>
                  <li><strong>Note 14:</strong> Other Non-Current Assets</li>
                  <li><strong>Note 15:</strong> Inventories (Raw Materials, WIP, FG)</li>
                  <li><strong>Note 16:</strong> Trade Receivables (Sundry Debtors)</li>
                  <li><strong>Note 17:</strong> Cash and Bank Balances</li>
                  <li><strong>Note 18:</strong> Other Current Assets (Prepaid, Accrued Inc.)</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 sm:col-span-2">
                <span className="font-black text-teal-700 text-xs">PROFIT &amp; LOSS SCHEDULES</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-slate-600 text-[11px]">
                  <div>
                    <p><strong>Note 19:</strong> Revenue from Operations</p>
                    <p><strong>Note 20:</strong> Other Income (Interest, Discounts)</p>
                    <p><strong>Note 21:</strong> Cost of Materials Consumed / Purchases</p>
                    <p><strong>Note 22:</strong> Employee Benefits Expense</p>
                  </div>
                  <div>
                    <p><strong>Note 23:</strong> Finance Costs (Bank Interest, Processing)</p>
                    <p><strong>Note 24:</strong> Depreciation and Amortization Expense</p>
                    <p><strong>Note 25:</strong> Other Administrative Expenses</p>
                    <p><strong>Notes 26-28:</strong> Contingent Liabilities &amp; Statutory Notes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'partner-capital',
        title: 'Partner Capital & Section 40(b)',
        badge: 'Tax Audit',
        icon: <Users className="w-4 h-4 text-purple-500" />,
        content: (
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Partnership Accounting &amp; Section 40(b) Ceiling Engine
            </h3>
            <p className="text-xs text-slate-600">
              Partnership firm financial statements require rigorous reconciliation of Partners' Capital and Current accounts along with statutory compliance under Section 40(b) of the Income-tax Act.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                Section 40(b) Statutory Allowability Rules on Book Profit
              </h4>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="font-bold text-slate-900">1. Working Partner Remuneration Limit:</div>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600 text-[11px]">
                    <li><strong>On first ₹3,00,000 of Book Profit (or Loss):</strong> Maximum of ₹1,50,000 or 90% of book profit, whichever is greater.</li>
                    <li><strong>On balance of Book Profit:</strong> Maximum of 60% of the remaining book profit.</li>
                    <li><em>Finance (No. 2) Act, 2024 revised limits:</em> ₹3,00,000 or 90% on first ₹6,00,000, and 60% thereafter (effective AY 2025-26).</li>
                  </ul>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="font-bold text-slate-900">2. Simple Interest on Capital u/s 40(b)(iv):</div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Allowable strictly up to <strong>12% simple interest per annum</strong>. Any interest paid in excess of 12% is disallowed in the firm's tax computation.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs space-y-2">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>How the In-App Partner Capital Engine Automates This:</span>
              </div>
              <p className="text-emerald-900 text-[11px]">
                Open the <strong>Partner Capital Modal</strong> from Step 4 or the header menu. The system automatically fetches Net Profit before partner payments, calculates statutory permissible remuneration, applies the 12% interest ceiling, and balances fixed capital against drawings!
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'msme',
        title: 'MSME Compliance & Form 3CD',
        icon: <Building className="w-4 h-4 text-teal-500" />,
        content: (
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
            <h3 className="text-lg font-bold text-slate-900">
              MSME Trade Payables Compliance (MSMED Act, 2006 &amp; Form 3CD Clause 22)
            </h3>
            <p className="text-xs text-slate-600">
              Statutory disclosures for Micro, Small and Medium Enterprises are mandatory under the ICAI Guidance Note and Tax Audit Form 3CD Clause 22.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                <h4 className="font-bold text-slate-800">Key MSMED Act Provisions:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                  <li><strong>Section 15 (Payment Period):</strong> Payment must be made within agreed terms, max <strong>45 days</strong>. If no written agreement, within <strong>15 days</strong>.</li>
                  <li><strong>Section 16 (Compound Interest):</strong> Buyer is liable to pay compound interest with monthly rests at <strong>3 times RBI Bank Rate</strong> for delayed payments.</li>
                  <li><strong>Section 23 (Disallowance):</strong> Interest payable under MSMED Act is <strong>not deductible</strong> for income tax calculation.</li>
                  <li><strong>Section 43B(h):</strong> Sums payable to Micro &amp; Small enterprises beyond the Section 15 timeline are disallowed in the year of accrual and allowed only upon actual payment.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 text-xs">
                <h4 className="font-bold text-teal-950 mb-1">In-App Note 9 MSME Breakdown:</h4>
                <p className="text-teal-900 text-[11px]">
                  Use the <strong>"MSME Due Details"</strong> modal to categorize trade payables into Micro, Small, Medium, and Others aging buckets (&lt;1 yr, 1-2 yrs, 2-3 yrs, &gt;3 yrs) with automatic interest computation.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'adjustments',
        title: 'Year-End Adjustments & Stock',
        icon: <Coins className="w-4 h-4 text-amber-500" />,
        content: (
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Closing Stock Valuation (AS-2) &amp; Year-End Adjustments
            </h3>
            <p className="text-xs text-slate-600">
              Trial Balances typically exclude closing inventory and require year-end statutory accruals:
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <h4 className="font-bold text-slate-800 mb-1">1. Closing Stock (AS-2):</h4>
                <p className="text-slate-600 text-[11px]">
                  Inventories must be valued at <strong>lower of cost and net realizable value (NRV)</strong>.
                  Enter closing stock in the <strong>Year-End Adjustments Modal</strong>. It simultaneously updates Current Assets (Note 15) and credits the Trading/P&amp;L Account (Note 21).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <h4 className="font-bold text-slate-800 mb-1">2. Depreciation under AS-10:</h4>
                <p className="text-slate-600 text-[11px]">
                  Depreciation must be systematically allocated over the useful life of tangible assets. The app supports Written Down Value (WDV) and Straight Line Method (SLM) schedules.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <h4 className="font-bold text-slate-800 mb-1">3. Income Tax / Advance Tax Adjustments:</h4>
                <p className="text-slate-600 text-[11px]">
                  Taxes deducted at source (TDS) and advance tax are categorized under Loans &amp; Advances (Note 13) until final income tax provision (Note 8) is offset.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'cloud-sync',
        title: 'Google Drive Sync & Privacy',
        badge: 'Security',
        icon: <Cloud className="w-4 h-4 text-blue-500" />,
        content: (
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Google Drive Cloud Sync &amp; Client Data Privacy Architecture
            </h3>
            <p className="text-xs text-slate-600">
              Confidentiality of financial and tax data is paramount for accounting professionals.
            </p>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2 text-xs">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero Third-Party Database Retention:</span>
              </div>
              <p className="text-emerald-900 text-[11px] leading-relaxed">
                Client ledger details, partner drawings, PANs, and accounting balances are <strong>never stored on external proprietary databases</strong>.
                When you connect Google Drive, data is synchronized solely into a secure folder named <code>CA Financial Statement Backups</code> inside <strong>your own Google Drive</strong>.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-800">Managing Google OAuth Sessions:</h4>
              <ul className="list-disc list-inside space-y-1.5 text-slate-600 text-[11px]">
                <li><strong>1-Hour Security Lifespan:</strong> Google Workspace access tokens naturally expire after 60 minutes for security compliance.</li>
                <li><strong>1-Click Reconnect:</strong> If your session expires, a rose banner appears with a <strong>[🔄 Reconnect &amp; Sync Drive]</strong> button. Simply click to re-authenticate and sync without losing any active edits.</li>
                <li><strong>Total Local Backup:</strong> You can click the <strong>Download icon (💾)</strong> in the header anytime to save an offline JSON backup of all company records directly to your workstation.</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        id: 'tax-audit',
        title: 'Tax Audit (3CB / 3CD) Linkages',
        icon: <FileCheck className="w-4 h-4 text-emerald-500" />,
        content: (
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Tax Audit Form 3CB / Form 3CD Cross-Referencing
            </h3>
            <p className="text-xs text-slate-600">
              Statements generated by AuditFinancials directly cross-reference clauses of Form 3CD:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <strong className="text-slate-800">Clause 13 (Method of Accounting):</strong>
                <p className="text-slate-500 text-[11px] mt-0.5">Mercantile accrual method compliant with ICAI AS standards.</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <strong className="text-slate-800">Clause 14 (Method of Inventory Valuation):</strong>
                <p className="text-slate-500 text-[11px] mt-0.5">Lower of cost or NRV under AS-2 &amp; Section 145A.</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <strong className="text-slate-800">Clause 22 (MSMED Interest Disallowance):</strong>
                <p className="text-slate-500 text-[11px] mt-0.5">Interest calculated from Note 9 MSME aging schedule.</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <strong className="text-slate-800">Clause 34 (TDS Compliance):</strong>
                <p className="text-slate-500 text-[11px] mt-0.5">Reconciled against Note 10 Duties &amp; Taxes Payable.</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'faq',
        title: 'FAQ & Troubleshooting',
        icon: <HelpCircle className="w-4 h-4 text-slate-500" />,
        content: (
          <div className="space-y-4 text-slate-700 leading-relaxed text-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Frequently Asked Questions (FAQ)
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <h4 className="font-bold text-slate-900">Q: What should I do if the Balance Sheet does not tally?</h4>
                <p className="text-slate-600 mt-1 text-[11px]">
                  Ensure that Current Year Net Profit from the Statement of Profit &amp; Loss has been transferred to Owners' Capital / Reserves (Note 3 / 4), and verify that all Trial Balance ledgers are assigned to a note schedule.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <h4 className="font-bold text-slate-900">Q: Can I edit an AI-mapped ledger's schedule manually?</h4>
                <p className="text-slate-600 mt-1 text-[11px]">
                  Yes! In Step 1 (Trial Balance Mapping), click the schedule dropdown next to any ledger account to instantly reassign it to any Note (Notes 3 to 25). The change updates the financial statements immediately.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <h4 className="font-bold text-slate-900">Q: How do I export statements for printing or sharing?</h4>
                <p className="text-slate-600 mt-1 text-[11px]">
                  In Step 5, click <strong>"Export Excel Workbook"</strong> for a complete multi-tab formatted spreadsheet, or click the <strong>Printer icon</strong> in the top header to save clean, high-resolution PDF statements with UDIN blocks.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <h4 className="font-bold text-slate-900">Q: Is Cash Flow Statement (AS-3) mandatory for partnership firms?</h4>
                <p className="text-slate-600 mt-1 text-[11px]">
                  For Level IV non-corporate entities (turnover &le; ₹10 Cr and borrowings &le; ₹2 Cr), AS-3 is completely exempt. However, the app includes an optional Cash Flow schedule if your client or banker requests it.
                </p>
              </div>
            </div>
          </div>
        ),
      },
    ],
    [onNavigateStep, onOpenAICopilot, onClose]
  );

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [sections, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5">
      <div className="bg-white w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  AuditFinancials User Manual &amp; ICAI CA Guide
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                  FY 2025-26
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Complete guide to preparing non-corporate entity financial statements under ICAI standards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title="Print or Save Manual as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Manual</span>
            </button>

            {onOpenAICopilot && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAICopilot('Can you explain how this application helps prepare ICAI Non-Corporate Entity financials?');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Ask AI Copilot</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guide topics (e.g. 'Section 40(b)', 'Level IV', 'Trial Balance', 'MSME', 'Closing stock')..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-slate-800"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Content Body: Sidebar + Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-64 bg-slate-50/80 border-r border-slate-200 flex flex-col overflow-y-auto shrink-0 p-2 space-y-1">
            {filteredSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                  activeSection === section.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={activeSection === section.id ? 'text-white' : ''}>
                    {section.icon}
                  </span>
                  <span className="truncate">{section.title}</span>
                </div>
                {section.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase shrink-0 ${
                      activeSection === section.id
                        ? 'bg-emerald-800 text-emerald-100'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {section.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active Section Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {sections.find((s) => s.id === activeSection)?.content}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-slate-100/80 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">ICAI NCE Technical Guide:</span>
            <span>Applicable for FY 2025-26 &amp; AY 2026-27</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer"
            >
              Close Manual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
