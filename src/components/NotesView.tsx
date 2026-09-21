import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  Building,
  ShieldCheck,
  DollarSign,
  Box,
  Calculator,
  Upload,
  Download,
  Sliders,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { NoteScheduleData, EntityConfig, ProfitAndLossData } from '../types';
import { NCE_NOTE_DEFINITIONS } from '../data/nceTaxonomy';
import { isPartnersRemunerationItem, formatINR } from '../utils/financialCalculations';
import { PartnerCapitalModal } from './PartnerCapitalModal';
import { TradePayablesMsmeModal } from './TradePayablesMsmeModal';
import { downloadPartnerCapitalTemplate } from '../utils/fileParsers';

interface NotesViewProps {
  noteSchedules: Record<number, NoteScheduleData>;
  config: EntityConfig;
  selectedNoteNumber?: number;
  onOpenYearEndAdjustments?: () => void;
  onOpenTradePayables?: () => void;
  onUpdateConfig?: (updated: Partial<EntityConfig>) => void;
  profitAndLoss?: Omit<ProfitAndLossData, 'previousYear'>;
}

export const NotesView: React.FC<NotesViewProps> = ({
  noteSchedules,
  config,
  selectedNoteNumber,
  onOpenYearEndAdjustments,
  onOpenTradePayables,
  onUpdateConfig,
  profitAndLoss,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isTradePayablesModalOpen, setIsTradePayablesModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'WITH_BALANCE' | 'BALANCE_SHEET' | 'PROFIT_LOSS' | 'POLICIES'>('ALL');
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

  const handleOpenTradePayables = () => {
    if (onOpenTradePayables) {
      onOpenTradePayables();
    } else {
      setIsTradePayablesModalOpen(true);
    }
  };

  // Auto-expand selected note if passed
  useEffect(() => {
    if (selectedNoteNumber) {
      setExpandedNotes((prev) => ({ ...prev, [selectedNoteNumber]: true }));
      // Scroll to note element
      const el = document.getElementById(`note-anchor-${selectedNoteNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // Default expand active notes
      const initial: Record<number, boolean> = {};
      NCE_NOTE_DEFINITIONS.forEach((def) => {
        const sched = noteSchedules[def.noteNumber];
        if (sched && sched.items.length > 0) {
          initial[def.noteNumber] = true;
        }
      });
      initial[1] = true;
      initial[2] = true;
      setExpandedNotes(initial);
    }
  }, [selectedNoteNumber, noteSchedules]);

  const toggleNote = (num: number) => {
    setExpandedNotes((prev) => ({ ...prev, [num]: !prev[num] }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    for (let i = 1; i <= 25; i++) all[i] = true;
    setExpandedNotes(all);
  };

  const collapseAll = () => {
    setExpandedNotes({});
  };

  const filteredDefinitions = useMemo(() => {
    return NCE_NOTE_DEFINITIONS.filter((def) => {
      // Category filter
      const sched = noteSchedules[def.noteNumber];
      const hasBalance = sched && sched.items.length > 0;

      if (categoryFilter === 'WITH_BALANCE' && !hasBalance && def.noteNumber >= 3) return false;
      if (categoryFilter === 'BALANCE_SHEET' && (def.statement !== 'BalanceSheet' || def.noteNumber < 3)) return false;
      if (categoryFilter === 'PROFIT_LOSS' && (def.statement !== 'ProfitAndLoss' || def.noteNumber < 3)) return false;
      if (categoryFilter === 'POLICIES' && def.noteNumber > 2) return false;

      // Search term filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchName = def.name.toLowerCase().includes(term);
      const matchNo = `note ${def.noteNumber}`.includes(term) || String(def.noteNumber) === term;
      const matchItem = sched?.items.some((it) => it.accountName.toLowerCase().includes(term));
      return matchName || matchNo || matchItem;
    });
  }, [searchTerm, noteSchedules, categoryFilter]);

  const formatINR = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>Statutory Notes to Financial Statements (Notes 1 to 25)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ICAI Non-Corporate Entity Schedules populated strictly from the mapped Trial Balance
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Note or ledger..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-56 transition"
              />
            </div>

            <button
              onClick={expandAll}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-medium text-slate-400 mr-1">Show:</span>
          {(
            [
              { id: 'ALL', label: 'All Notes (1–25)' },
              { id: 'WITH_BALANCE', label: 'Active with Balances' },
              { id: 'BALANCE_SHEET', label: 'Balance Sheet (Notes 3–18)' },
              { id: 'PROFIT_LOSS', label: 'Profit & Loss (Notes 19–25)' },
              { id: 'POLICIES', label: 'Mandatory Policies (Notes 1–2)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                categoryFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {filteredDefinitions.map((def) => {
          const isExpanded = !!expandedNotes[def.noteNumber];
          const schedule = noteSchedules[def.noteNumber];
          const hasItems = schedule && schedule.items.length > 0;
          const totalAmt = schedule?.totalAmount || 0;

          return (
            <div
              key={def.noteNumber}
              id={`note-anchor-${def.noteNumber}`}
              className={`bg-white rounded-xl border transition-shadow shadow-xs overflow-hidden ${
                selectedNoteNumber === def.noteNumber
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Note Header Accordion Toggle */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleNote(def.noteNumber)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleNote(def.noteNumber);
                  }
                }}
                className="w-full text-left p-4 bg-slate-50/70 hover:bg-slate-50 transition flex items-center justify-between border-b border-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                    {def.noteNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{def.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium whitespace-nowrap">
                        {def.statement === 'BalanceSheet' ? 'Balance Sheet' : 'Profit & Loss'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{def.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Dedicated Edit Button on Header for Note 3 */}
                  {def.noteNumber === 3 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPartnerModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold text-xs rounded-lg shadow-2xs transition cursor-pointer"
                      title="Edit Note 3: Capital Account Reconciliation & PSR"
                    >
                      <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{config.entityType === 'Sole Proprietorship' ? 'Edit Capital Account' : 'Edit Schedule & PSR'}</span>
                    </button>
                  )}

                  {/* Dedicated Edit Button on Header for Note 9 */}
                  {def.noteNumber === 9 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTradePayables();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold text-xs rounded-lg shadow-2xs transition cursor-pointer"
                      title="Edit Note 9: MSME dues, Section 22 disclosures & aging schedule"
                    >
                      <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Edit Creditors MSME Data</span>
                    </button>
                  )}

                  {def.noteNumber >= 3 && (
                    <div className="flex items-center gap-3 text-right bg-slate-100/90 px-3 py-1 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">CY ({config.financialYear})</span>
                        <span className="font-mono font-bold text-emerald-800 text-xs">
                          ₹{formatINR(totalAmt)}
                        </span>
                      </div>
                      <div className="border-l border-slate-300 pl-3">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">PY ({config.previousFinancialYear || '2023-24'})</span>
                        <span className="font-mono font-semibold text-slate-700 text-xs">
                          ₹{formatINR(schedule?.previousYearAmount || 0)}
                        </span>
                      </div>
                    </div>
                  )}

                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Note Expanded Body */}
              {isExpanded && (
                <div className="p-5 space-y-4">
                  {/* Note 1: Entity Overview & Domicile */}
                  {def.noteNumber === 1 && (
                    <div className="space-y-3 text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-lg border border-slate-200">
                      <p>
                        <strong>1.1 General Information:</strong> {config.entityName} is a {config.entityType} domiciled in India. The entity is engaged in commercial business operations. The financial statements for the reporting period ended {config.reportingPeriod} (Comparative period ended {config.previousReportingPeriod || 'March 31, 2024'}) have been prepared in accordance with the Guidance Note on Financial Statements of Non-Corporate Entities issued by the Institute of Chartered Accountants of India (ICAI).
                      </p>
                      {config.registeredAddress && (
                        <p>
                          <strong>1.2 Registered Principal Place of Business:</strong> {config.registeredAddress}
                        </p>
                      )}
                      {config.entityType === 'Sole Proprietorship' && config.proprietorName && (
                        <p>
                          <strong>1.3 Sole Proprietor:</strong> The entity is owned and managed by <strong>{config.proprietorName}</strong> as Sole Proprietor.
                        </p>
                      )}
                      {config.placeOfSigning && (
                        <p>
                          <strong>1.4 Place of Signing:</strong> {config.placeOfSigning}
                        </p>
                      )}
                      {config.dateOfSigning && (
                        <p>
                          <strong>1.5 Date of Signing / Adoption:</strong> {config.dateOfSigning}
                        </p>
                      )}
                      <p>
                        <strong>1.6 Entity Classification:</strong> For the purpose of applicability of Accounting Standards, the entity is classified as a Non-Corporate Entity (Level II / Level III) under ICAI criteria based on turnover and borrowings thresholds.
                      </p>
                      <p>
                        <strong>1.7 Rounding of Amounts:</strong> Figures have been stated in Indian Rupees (₹) rounded off to the nearest rupee. Comparative prior period figures have been regrouped/reclassified wherever necessary to conform to current period presentation.
                      </p>
                    </div>
                  )}

                  {/* Note 2: Significant Accounting Policies */}
                  {def.noteNumber === 2 && (
                    <div className="space-y-4 bg-slate-50/50 p-4 sm:p-5 rounded-xl border border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                            ICAI Mandatory Accounting Policies (Form 3CB/3CD &amp; Guidance Note Compliant)
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Applicable Accounting Standards issued by the Institute of Chartered Accountants of India for Non-Corporate Entities.
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md shrink-0 self-start sm:self-center">
                          17 Statutory Policies
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3.5 text-xs text-slate-700">
                        {(schedule?.statutoryNotes && schedule.statutoryNotes.length > 0 ? schedule.statutoryNotes : def.mandatoryDisclosures || []).map((policyStr, pIdx) => {
                          let finalPolicyStr = policyStr;
                          if (config.entityType === 'Sole Proprietorship' && policyStr.includes('2.14')) {
                            finalPolicyStr = "2.14 Proprietor's Capital and Drawings: Capital introduced and personal drawings made by the proprietor during the period are accounted for directly through the Proprietor's Capital Account (Note 3). Any remuneration, salary, or interest drawn by the proprietor is treated as withdrawals / distribution of capital and is not an allowable business expenditure in the Statement of Profit and Loss.";
                          }
                          const colonIdx = finalPolicyStr.indexOf(':');
                          const rawTitle = colonIdx > -1 ? finalPolicyStr.substring(0, colonIdx).trim() : `Policy 2.${pIdx + 1}`;
                          const desc = colonIdx > -1 ? finalPolicyStr.substring(colonIdx + 1).trim() : finalPolicyStr;
                          
                          // Extract AS tag if present
                          const asMatch = rawTitle.match(/\((AS\s*[\d&,\s]+|Sec[^)]+)\)/i);
                          const asBadge = asMatch ? asMatch[1] : rawTitle.includes('2.1') ? 'AS 1 / ICAI' : null;
                          const cleanTitle = rawTitle.replace(/\s*\((AS\s*[\d&,\s]+|Sec[^)]+)\)/i, '').trim();

                          return (
                            <div
                              key={pIdx}
                              className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                                  <span className="font-bold text-slate-900 text-xs leading-snug break-words">
                                    {cleanTitle || rawTitle}
                                  </span>
                                </div>
                                {asBadge && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded shrink-0 whitespace-nowrap">
                                    {asBadge}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 text-xs leading-relaxed pl-3 border-l-2 border-slate-200 break-words">
                                {desc}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes 3 to 25: Mapped Ledgers Table */}
                  {def.noteNumber >= 3 && (
                    <div>
                      {(def.noteNumber === 15 || def.noteNumber === 21) && onOpenYearEndAdjustments && (
                        <div className="mb-3.5 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-emerald-950">
                          <div className="flex items-start gap-2.5">
                            <Box className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block">Year-End Closing Stock Entry ({def.noteNumber === 15 ? 'Note 15: Inventories' : 'Note 21: Cost of Goods Sold'})</span>
                              <span className="text-[11px] text-slate-600">
                                {config.yearEndAdjustments?.closingStockCY !== undefined
                                  ? `Current Closing Stock value: ₹${config.yearEndAdjustments.closingStockCY.toLocaleString('en-IN')}`
                                  : 'Closing Stock missing in raw Trial Balance? Click to enter valued stock count and adjust COGS.'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={onOpenYearEndAdjustments}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition shrink-0 self-start sm:self-auto"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span>{config.yearEndAdjustments?.closingStockCY !== undefined ? 'Update Stock Entry' : 'Enter Closing Stock'}</span>
                          </button>
                        </div>
                      )}

                      {/* Note 9: Statutory MSME & Aging Schedule (Formatted identical to Note 3) */}
                      {def.noteNumber === 9 && (() => {
                        const tpConfig = config.tradePayablesConfig;
                        const msmeCreditors = schedule?.items.filter((it) => {
                          const sub = (it.subCategory || '').toLowerCase();
                          const name = (it.accountName || '').toLowerCase();
                          const isOther = sub.includes('other than micro') || name.includes('other than micro') || name.includes('other creditors');
                          return !isOther && (sub.includes('msme') || name.includes('msme') || sub.includes('micro') || name.includes('micro') || sub.includes('(a)'));
                        }) || [];

                        const rawMsmeCY = msmeCreditors.reduce(
                          (acc, it) => acc + (it.displayBalance !== undefined ? it.displayBalance : it.netBalance),
                          0
                        );
                        const rawMsmePY = msmeCreditors.reduce(
                          (acc, it) => acc + (it.previousYearBalance || 0),
                          0
                        );
                        const totalCY = schedule?.totalAmount || 0;
                        const totalPY = schedule?.previousYearAmount || 0;

                        const msmeTotalCY = tpConfig?.msmeAmountCY !== undefined ? tpConfig.msmeAmountCY : rawMsmeCY;
                        const msmeTotalPY = tpConfig?.msmeAmountPY !== undefined ? tpConfig.msmeAmountPY : rawMsmePY;
                        const otherTotalCY = tpConfig?.othersAmountCY !== undefined ? tpConfig.othersAmountCY : Math.max(0, totalCY - msmeTotalCY);
                        const otherTotalPY = tpConfig?.othersAmountPY !== undefined ? tpConfig.othersAmountPY : Math.max(0, totalPY - msmeTotalPY);

                        // Reconciliation check
                        const classifiedSum = msmeTotalCY + otherTotalCY;
                        const diffCY = Math.round((classifiedSum - totalCY) * 100) / 100;
                        const isReconciled = Math.abs(diffCY) < 0.05;

                        // Aging items from tpConfig
                        const agMsme_lt1 = tpConfig?.agingMsmeLess1Yr !== undefined ? tpConfig.agingMsmeLess1Yr : msmeTotalCY;
                        const agMsme_12 = tpConfig?.agingMsme1To2Yrs || 0;
                        const agMsme_23 = tpConfig?.agingMsme2To3Yrs || 0;
                        const agMsme_m3 = tpConfig?.agingMsmeMore3Yrs || 0;
                        const agMsme_tot = agMsme_lt1 + agMsme_12 + agMsme_23 + agMsme_m3;

                        const agOth_lt1 = tpConfig?.agingOthersLess1Yr !== undefined ? tpConfig.agingOthersLess1Yr : otherTotalCY;
                        const agOth_12 = tpConfig?.agingOthers1To2Yrs || 0;
                        const agOth_23 = tpConfig?.agingOthers2To3Yrs || 0;
                        const agOth_m3 = tpConfig?.agingOthersMore3Yrs || 0;
                        const agOth_tot = agOth_lt1 + agOth_12 + agOth_23 + agOth_m3;

                        const agDispMsme_lt1 = tpConfig?.agingDisputedMsmeLess1Yr || 0;
                        const agDispMsme_12 = tpConfig?.agingDisputedMsme1To2Yrs || 0;
                        const agDispMsme_23 = tpConfig?.agingDisputedMsme2To3Yrs || 0;
                        const agDispMsme_m3 = tpConfig?.agingDisputedMsmeMore3Yrs || 0;
                        const agDispMsme_tot = agDispMsme_lt1 + agDispMsme_12 + agDispMsme_23 + agDispMsme_m3;

                        const agDispOth_lt1 = tpConfig?.agingDisputedOthersLess1Yr || 0;
                        const agDispOth_12 = tpConfig?.agingDisputedOthers1To2Yrs || 0;
                        const agDispOth_23 = tpConfig?.agingDisputedOthers2To3Yrs || 0;
                        const agDispOth_m3 = tpConfig?.agingDisputedOthersMore3Yrs || 0;
                        const agDispOth_tot = agDispOth_lt1 + agDispOth_12 + agDispOth_23 + agDispOth_m3;

                        const grandAgingCY = agMsme_tot + agOth_tot + agDispMsme_tot + agDispOth_tot;
                        const agingDiff = Math.round((grandAgingCY - totalCY) * 100) / 100;
                        const isAgingReconciled = Math.abs(agingDiff) < 0.05;

                        // Sec 22 items
                        const s22PrincipalCY = tpConfig?.msmeSec22PrincipalCY !== undefined ? tpConfig.msmeSec22PrincipalCY : msmeTotalCY;
                        const s22InterestCY = tpConfig?.msmeSec22InterestCY || 0;
                        const s22PrincipalPY = tpConfig?.msmeSec22PrincipalPY !== undefined ? tpConfig.msmeSec22PrincipalPY : msmeTotalPY;
                        const s22InterestPY = tpConfig?.msmeSec22InterestPY || 0;

                        const s22DelayedCY = tpConfig?.msmeSec22DelayedPaymentsCY || 0;
                        const s22DelayedPY = tpConfig?.msmeSec22DelayedPaymentsPY || 0;
                        const s22IntPaidCY = tpConfig?.msmeSec22InterestPaidCY || 0;
                        const s22IntPaidPY = tpConfig?.msmeSec22InterestPaidPY || 0;

                        const s22IntDueCY = tpConfig?.msmeSec22InterestDueDelayCY || 0;
                        const s22IntDuePY = tpConfig?.msmeSec22InterestDueDelayPY || 0;

                        const s22IntAccruedCY = tpConfig?.msmeSec22InterestAccruedCY || 0;
                        const s22IntAccruedPY = tpConfig?.msmeSec22InterestAccruedPY || 0;

                        const s22FurtherIntCY = tpConfig?.msmeSec22FurtherInterestCY || 0;
                        const s22FurtherIntPY = tpConfig?.msmeSec22FurtherInterestPY || 0;

                        return (
                          <div className="mb-5 space-y-3">
                            {/* Statutory Header Bar matching Note 3 */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-100">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                  Note 9 Statutory Schedule: Trade Payables MSME &amp; Aging Schedule (Page 8)
                                </h4>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleOpenTradePayables}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-2xs transition cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Reconcile Trade Payables</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleOpenTradePayables}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold text-xs rounded-lg shadow-2xs transition cursor-pointer"
                                >
                                  <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Edit Creditors MSME &amp; Aging</span>
                                </button>
                              </div>
                            </div>

                            {/* Variance Alert Banner matching Note 3 */}
                            {(!isReconciled || !isAgingReconciled) && (
                              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>
                                    Trade Payables Schedule Total (₹{formatINR(classifiedSum)}) {!isReconciled ? `differs from Balance Sheet Note 9 Total (₹${formatINR(totalCY)}) by ₹${formatINR(Math.abs(diffCY))}` : ''}
                                    {!isAgingReconciled ? ` and Aging Total (₹${formatINR(grandAgingCY)}) differs by ₹${formatINR(Math.abs(agingDiff))}` : ''}.
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleOpenTradePayables}
                                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] rounded-md transition shadow-2xs cursor-pointer"
                                >
                                  Reconcile Schedule
                                </button>
                              </div>
                            )}

                            {/* Table 1: Statutory Sub-Classification (ICAI NCE Format - Page 8) */}
                            <div className="overflow-x-auto border border-emerald-300/80 rounded-xl shadow-xs">
                              <table className="w-full text-left text-[11px] border-collapse min-w-[720px]">
                                <thead>
                                  <tr className="bg-emerald-900 text-white font-semibold">
                                    <th className="py-2.5 px-3">Statutory Schedule Head (ICAI Guidance Note - Page 8)</th>
                                    <th className="py-2.5 px-3 text-right w-44">Current Period ({config.reportingPeriod || 'CY'})</th>
                                    <th className="py-2.5 px-3 text-right w-44">Previous Period ({config.previousReportingPeriod || 'PY'})</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-100 bg-emerald-50/20 text-slate-800">
                                  <tr className="hover:bg-white transition font-medium">
                                    <td className="py-2 px-3 text-slate-900">
                                      (a) Total outstanding dues of micro, small and medium enterprises (MSME)
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900">{formatINR(msmeTotalCY)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-600">{formatINR(msmeTotalPY)}</td>
                                  </tr>
                                  <tr className="hover:bg-white transition font-medium">
                                    <td className="py-2 px-3 text-slate-900">
                                      (b) Total outstanding dues of creditors other than micro, small and medium enterprises
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(otherTotalCY)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-600">{formatINR(otherTotalPY)}</td>
                                  </tr>
                                  <tr className="bg-emerald-100/90 font-bold text-emerald-950 border-t-2 border-emerald-300 text-xs">
                                    <td className="py-2 px-3 uppercase tracking-wider">Total Trade Payables</td>
                                    <td className="py-2 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-200">{formatINR(classifiedSum)}</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-slate-200/70">{formatINR(totalPY)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Table 2: Trade Payables Aging Schedule as at reporting date */}
                            <div className="overflow-x-auto border border-emerald-300/80 rounded-xl shadow-xs">
                              <div className="bg-emerald-950 text-emerald-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between border-b border-emerald-800">
                                <span>Trade Payables Aging Schedule as at {config.reportingPeriod}</span>
                                <span className="text-[10px] font-normal text-emerald-300">(Amount in ₹)</span>
                              </div>
                              <table className="w-full text-left text-[11px] border-collapse min-w-[720px]">
                                <thead>
                                  <tr className="bg-emerald-900 text-white font-semibold">
                                    <th className="py-2.5 px-3">Particulars</th>
                                    <th className="py-2.5 px-2 text-right w-24">&lt; 1 Year</th>
                                    <th className="py-2.5 px-2 text-right w-24">1 - 2 Years</th>
                                    <th className="py-2.5 px-2 text-right w-24">2 - 3 Years</th>
                                    <th className="py-2.5 px-2 text-right w-24">&gt; 3 Years</th>
                                    <th className="py-2.5 px-3 text-right w-32 font-bold text-emerald-200 bg-emerald-950">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-100 bg-emerald-50/20 text-slate-800">
                                  <tr className="hover:bg-white transition font-medium">
                                    <td className="py-2 px-3 font-semibold text-slate-900">(i) MSME</td>
                                    <td className="py-2 px-2 text-right font-mono">{formatINR(agMsme_lt1)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agMsme_12)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agMsme_23)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agMsme_m3)}</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-950 bg-emerald-100/60">{formatINR(agMsme_tot)}</td>
                                  </tr>
                                  <tr className="hover:bg-white transition font-medium">
                                    <td className="py-2 px-3 font-semibold text-slate-900">(ii) Others</td>
                                    <td className="py-2 px-2 text-right font-mono">{formatINR(agOth_lt1)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agOth_12)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agOth_23)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agOth_m3)}</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-950 bg-emerald-100/60">{formatINR(agOth_tot)}</td>
                                  </tr>
                                  <tr className="hover:bg-white transition font-medium">
                                    <td className="py-2 px-3 text-slate-700">(iii) Disputed dues - MSME</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agDispMsme_lt1)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agDispMsme_12)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agDispMsme_23)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agDispMsme_m3)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-500">{formatINR(agDispMsme_tot)}</td>
                                  </tr>
                                  <tr className="hover:bg-white transition font-medium">
                                    <td className="py-2 px-3 text-slate-700">(iv) Disputed dues - Others</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agDispOth_lt1)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agDispOth_12)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agDispOth_23)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-400">{formatINR(agDispOth_m3)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-500">{formatINR(agDispOth_tot)}</td>
                                  </tr>
                                  <tr className="bg-emerald-100/90 font-bold text-emerald-950 border-t-2 border-emerald-300 text-xs">
                                    <td className="py-2 px-3 uppercase tracking-wider">Total Trade Payables</td>
                                    <td className="py-2 px-2 text-right font-mono">{formatINR(agMsme_lt1 + agOth_lt1 + agDispMsme_lt1 + agDispOth_lt1)}</td>
                                    <td className="py-2 px-2 text-right font-mono">{formatINR(agMsme_12 + agOth_12 + agDispMsme_12 + agDispOth_12)}</td>
                                    <td className="py-2 px-2 text-right font-mono">{formatINR(agMsme_23 + agOth_23 + agDispMsme_23 + agDispOth_23)}</td>
                                    <td className="py-2 px-2 text-right font-mono">{formatINR(agMsme_m3 + agOth_m3 + agDispMsme_m3 + agDispOth_m3)}</td>
                                    <td className="py-2 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-200">{formatINR(grandAgingCY)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Table 3: Disclosure relating to suppliers registered under MSMED Act (Section 22) */}
                            <div className="overflow-x-auto border border-emerald-300/80 rounded-xl shadow-xs">
                              <div className="bg-emerald-950 text-emerald-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between border-b border-emerald-800">
                                <span>Disclosure relating to suppliers registered under MSMED Act (Section 22)</span>
                                <span className="text-[10px] font-normal text-emerald-300">(Amount in ₹)</span>
                              </div>
                              <table className="w-full text-left text-[11px] border-collapse min-w-[720px]">
                                <thead>
                                  <tr className="bg-emerald-900 text-white font-semibold">
                                    <th className="py-2.5 px-3">Statutory Disclosure Item</th>
                                    <th className="py-2.5 px-3 text-right w-40">CY ({config.reportingPeriod || 'CY'})</th>
                                    <th className="py-2.5 px-3 text-right w-40">PY ({config.previousReportingPeriod || 'PY'})</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-100 bg-emerald-50/20 text-slate-800">
                                  <tr className="hover:bg-white transition font-medium">
                                    <td className="py-2 px-3">
                                      <span className="font-semibold text-slate-900 block">(a) Principal amount and interest due thereon remaining unpaid to any supplier as at the end of each accounting year:</span>
                                      <div className="pl-4 text-slate-600 text-[10px] space-y-0.5 mt-1">
                                        <div>• Principal amount: <span className="font-mono font-semibold text-slate-800">₹{formatINR(s22PrincipalCY)}</span></div>
                                        <div>• Interest due thereon: <span className="font-mono font-semibold text-slate-800">₹{formatINR(s22InterestCY)}</span></div>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-950 align-top pt-2.5">{formatINR(s22PrincipalCY + s22InterestCY)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-600 align-top pt-2.5">{formatINR(s22PrincipalPY + s22InterestPY)}</td>
                                  </tr>
                                  <tr className="hover:bg-white transition font-medium">
                                    <td className="py-2 px-3 text-slate-900">
                                      (b) The amount of interest paid by the buyer in terms of section 16 of the MSMED Act, along with the amount of the payment made to the supplier beyond the appointed day during each accounting year.
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono align-top pt-2.5">{formatINR(s22IntPaidCY)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-600 align-top pt-2.5">{formatINR(s22IntPaidPY)}</td>
                                  </tr>
                                  <tr className="hover:bg-white transition font-medium">
                                    <td className="py-2 px-3 text-slate-900">
                                      (c) The amount of interest due and payable for the period of delay in making payment (which have been paid but beyond the appointed day during the year) but without adding the interest specified under the MSMED Act.
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono align-top pt-2.5">{formatINR(s22IntDueCY)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-600 align-top pt-2.5">{formatINR(s22IntDuePY)}</td>
                                  </tr>
                                  <tr className="hover:bg-white transition font-medium">
                                    <td className="py-2 px-3 text-slate-900">
                                      (d) The amount of interest accrued and remaining unpaid at the end of each accounting year.
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono align-top pt-2.5">{formatINR(s22IntAccruedCY)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-600 align-top pt-2.5">{formatINR(s22IntAccruedPY)}</td>
                                  </tr>
                                  <tr className="hover:bg-white transition font-medium">
                                    <td className="py-2 px-3 text-slate-900">
                                      (e) The amount of further interest remaining due and payable even in the succeeding years, until such date when the interest dues above are actually paid to the small enterprise.
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono align-top pt-2.5">{formatINR(s22FurtherIntCY)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-600 align-top pt-2.5">{formatINR(s22FurtherIntPY)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Note 3: Official ICAI Partner / Owner Capital Account Table */}
                      {def.noteNumber === 3 && (() => {
                        const isProprietor = config.entityType === 'Sole Proprietorship';
                        return (
                          <div className="mb-5 space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-100">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                  {isProprietor
                                    ? "Note 3 Statutory Schedule: Proprietor's Capital Account Reconciliation (Page 6)"
                                    : config.entityType === 'LLP'
                                    ? "Note 3 Statutory Schedule: Partners' / Designated Partners' Capital Account Reconciliation (Page 6)"
                                    : "Note 3 Statutory Schedule: Partners' Capital Account Reconciliation (Page 6)"}
                                </h4>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setIsPartnerModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-2xs transition"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{isProprietor ? "Upload Proprietor Ledger / Statement" : "Upload Partner Ledgers / Statement"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsPartnerModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold text-xs rounded-lg shadow-2xs transition"
                                >
                                  <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>{isProprietor ? "Edit Capital Account" : "Edit Schedule & PSR"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadPartnerCapitalTemplate(
                                      config.entityName,
                                      config.partners ||
                                        (schedule.partnerCapitalTable || []).map((r) => ({
                                          name: r.partnerName,
                                          profitSharePercent: r.profitSharePercent,
                                        }))
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition"
                                  title="Download pre-formatted Excel template"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Template</span>
                                </button>
                              </div>
                            </div>

                            {/* Variance Alert Banner if schedule closing total != Note 3 total */}
                            {(() => {
                              const schedTotal = (schedule.partnerCapitalTable || []).reduce(
                                (s, r) => s + r.closingBalance,
                                0
                              );
                              const diff = Math.round((totalAmt - schedTotal) * 100) / 100;
                              if (Math.abs(diff) >= 0.05 && (schedule.partnerCapitalTable || []).length > 0) {
                                return (
                                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                      <span>
                                        {isProprietor ? "Proprietor Schedule Total" : "Partner Schedule Total"} (₹{formatINR(schedTotal)}) differs from Balance Sheet Note 3 Total (₹{formatINR(totalAmt)}) by ₹{formatINR(Math.abs(diff))}.
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setIsPartnerModalOpen(true)}
                                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] rounded-md transition shadow-2xs"
                                    >
                                      Reconcile Schedule
                                    </button>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            <div className="overflow-x-auto border border-emerald-300/80 rounded-xl shadow-xs">
                              <table className={`w-full text-left text-[11px] border-collapse ${isProprietor ? 'min-w-[780px]' : 'min-w-[920px]'}`}>
                                <thead>
                                  <tr className="bg-emerald-900 text-white font-semibold">
                                    <th className="py-2.5 px-2 text-center w-12">Sr. No.</th>
                                    <th className="py-2.5 px-3">{isProprietor ? "Name of Proprietor" : "Name of Partner / Designated Partner / Owner"}</th>
                                    {!isProprietor && (
                                      <>
                                        <th className="py-2.5 px-2 text-center w-16" title="Profit Sharing Ratio">Profit (%)</th>
                                        <th className="py-2.5 px-2 text-center w-16" title="Remuneration Sharing Ratio u/s 40(b)">Remun (%)</th>
                                      </>
                                    )}
                                    <th className="py-2.5 px-3 text-right">As at 1st April (Opening)</th>
                                    <th className="py-2.5 px-3 text-right">Capital Introduced</th>
                                    {!isProprietor && (
                                      <th className="py-2.5 px-3 text-right">Remuneration</th>
                                    )}
                                    <th className="py-2.5 px-3 text-right">{isProprietor ? "Interest on Capital" : "Interest"}</th>
                                    <th className="py-2.5 px-3 text-right">{isProprietor ? "Drawings / Withdrawals" : "Withdrawals"}</th>
                                    <th className="py-2.5 px-3 text-right">{isProprietor ? "Net Profit / (Loss) for the year" : "Share of Profit/Loss"}</th>
                                    <th className="py-2.5 px-3 text-right font-bold text-emerald-200 bg-emerald-950">As at 31st March (Closing)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-100 bg-emerald-50/20 text-slate-800">
                                  {(schedule.partnerCapitalTable || []).map((row) => {
                                    const remunPct = row.remunerationSharePercent !== undefined ? row.remunerationSharePercent : row.profitSharePercent;
                                    return (
                                      <tr key={row.srNo} className="hover:bg-white transition font-medium">
                                        <td className="py-2 px-2 text-center font-mono text-slate-500">{row.srNo}</td>
                                        <td className="py-2 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                                          <span>{row.partnerName}</span>
                                          {row.isDesignatedPartner && config.entityType === 'LLP' && (
                                            <span className="text-[9px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-medium">DP</span>
                                          )}
                                        </td>
                                        {!isProprietor && (
                                          <>
                                            <td className="py-2 px-2 text-center font-mono text-slate-700">{row.profitSharePercent}%</td>
                                            <td className="py-2 px-2 text-center font-mono text-teal-800 font-semibold">{remunPct}%</td>
                                          </>
                                        )}
                                        <td className="py-2 px-3 text-right font-mono">{formatINR(row.openingBalance)}</td>
                                        <td className="py-2 px-3 text-right font-mono">{row.capitalIntroduced ? formatINR(row.capitalIntroduced) : '-'}</td>
                                        {!isProprietor && (
                                          <td className="py-2 px-3 text-right font-mono text-emerald-900 font-semibold">{row.remuneration ? formatINR(row.remuneration) : '-'}</td>
                                        )}
                                        <td className="py-2 px-3 text-right font-mono">{row.interestOnCapital ? formatINR(row.interestOnCapital) : '-'}</td>
                                        <td className="py-2 px-3 text-right font-mono text-rose-700">{row.withdrawals ? `(${formatINR(row.withdrawals)})` : '-'}</td>
                                        <td className={`py-2 px-3 text-right font-mono font-semibold ${row.shareOfProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                                          {formatINR(row.shareOfProfit)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-950 bg-emerald-100/60">{formatINR(row.closingBalance)}</td>
                                      </tr>
                                    );
                                  })}
                                  {/* Current Year Total Row */}
                                  <tr className="bg-emerald-100/90 font-bold text-emerald-950 border-t-2 border-emerald-300 text-xs">
                                    <td colSpan={2} className="py-2 px-3 text-right uppercase tracking-wider">Total (CY)</td>
                                    {!isProprietor && (
                                      <>
                                        <td className="py-2 px-2 text-center font-mono">100%</td>
                                        <td className="py-2 px-2 text-center font-mono text-teal-800">100%</td>
                                      </>
                                    )}
                                    <td className="py-2 px-3 text-right font-mono">{formatINR((schedule.partnerCapitalTable || []).reduce((s, r) => s + r.openingBalance, 0))}</td>
                                    <td className="py-2 px-3 text-right font-mono">{formatINR((schedule.partnerCapitalTable || []).reduce((s, r) => s + r.capitalIntroduced, 0))}</td>
                                    {!isProprietor && (
                                      <td className="py-2 px-3 text-right font-mono">{formatINR((schedule.partnerCapitalTable || []).reduce((s, r) => s + r.remuneration, 0))}</td>
                                    )}
                                    <td className="py-2 px-3 text-right font-mono">{formatINR((schedule.partnerCapitalTable || []).reduce((s, r) => s + r.interestOnCapital, 0))}</td>
                                    <td className="py-2 px-3 text-right font-mono text-rose-800">{formatINR((schedule.partnerCapitalTable || []).reduce((s, r) => s + r.withdrawals, 0))}</td>
                                    <td className="py-2 px-3 text-right font-mono">{formatINR((schedule.partnerCapitalTable || []).reduce((s, r) => s + r.shareOfProfit, 0))}</td>
                                    <td className="py-2 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-200">{formatINR(totalAmt)}</td>
                                  </tr>
                                  {/* Previous Year (PY) Row */}
                                  <tr className="bg-slate-100 font-semibold text-slate-700 border-t border-slate-300 text-[10px]">
                                    <td colSpan={2} className="py-1.5 px-3 uppercase text-slate-600">Previous Year (PY)</td>
                                    {!isProprietor && (
                                      <>
                                        <td className="py-1.5 px-2 text-center font-mono">100%</td>
                                        <td className="py-1.5 px-2 text-center font-mono text-teal-800">100%</td>
                                      </>
                                    )}
                                    <td className="py-1.5 px-3 text-right font-mono">{formatINR((schedule.pyPartnerCapitalTable || []).reduce((s, r) => s + r.openingBalance, 0))}</td>
                                    <td className="py-1.5 px-3 text-right font-mono">{formatINR((schedule.pyPartnerCapitalTable || []).reduce((s, r) => s + r.capitalIntroduced, 0))}</td>
                                    {!isProprietor && (
                                      <td className="py-1.5 px-3 text-right font-mono">{formatINR((schedule.pyPartnerCapitalTable || []).reduce((s, r) => s + r.remuneration, 0))}</td>
                                    )}
                                    <td className="py-1.5 px-3 text-right font-mono">{formatINR((schedule.pyPartnerCapitalTable || []).reduce((s, r) => s + r.interestOnCapital, 0))}</td>
                                    <td className="py-1.5 px-3 text-right font-mono">{formatINR((schedule.pyPartnerCapitalTable || []).reduce((s, r) => s + r.withdrawals, 0))}</td>
                                    <td className="py-1.5 px-3 text-right font-mono">{formatINR((schedule.pyPartnerCapitalTable || []).reduce((s, r) => s + r.shareOfProfit, 0))}</td>
                                    <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 bg-slate-200">{formatINR(schedule.previousYearAmount || 0)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}

                      {!hasItems ? (
                        <div className="p-4 rounded-lg bg-slate-50 text-center text-xs text-slate-500 border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                          <p>Nil balance / No ledger accounts mapped to Note {def.noteNumber} in the current or comparative period.</p>
                          {(def.noteNumber === 15 || def.noteNumber === 21) && onOpenYearEndAdjustments && (
                            <button
                              type="button"
                              onClick={onOpenYearEndAdjustments}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition"
                            >
                              <Calculator className="w-4 h-4" />
                              <span>{config.yearEndAdjustments?.closingStockCY !== undefined ? 'Update Closing Stock Entry' : '+ Enter Closing Stock Value'}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                                <th className="py-2.5 px-3 w-16">Code</th>
                                <th className="py-2.5 px-3">Trial Balance Ledger Account</th>
                                <th className="py-2.5 px-3">Sub-Schedule Category</th>
                                <th className="py-2.5 px-3 text-right font-bold text-emerald-950 bg-emerald-50/60 border-l border-slate-200">
                                  Current Period ({config.reportingPeriod || 'CY'}) (₹)
                                </th>
                                <th className="py-2.5 px-3 text-right font-bold text-slate-800 bg-slate-100/70 border-l border-slate-200">
                                  Previous Period ({config.previousReportingPeriod || 'PY'}) (₹)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {schedule.items.map((item, itemIdx) => {
                                const cyAmt = item.displayBalance !== undefined ? item.displayBalance : item.netBalance;
                                const pyAmt = item.previousYearBalance !== undefined ? item.previousYearBalance : 0;

                                return (
                                  <tr key={item.id ? `${item.id}-${itemIdx}` : `note-item-${def.noteNumber}-${itemIdx}-${item.accountName}`} className="hover:bg-slate-50/80 transition">
                                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                                      {item.accountCode || '-'}
                                    </td>
                                    <td className="py-2.5 px-3 font-medium text-slate-900">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span>{item.accountName}</span>
                                        {isPartnersRemunerationItem(item) && config.entityType !== 'Sole Proprietorship' && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                            Line X: Partners' Remuneration
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                      {item.subCategory}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-950 bg-emerald-50/20 border-l border-slate-200">
                                      {formatINR(cyAmt)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 bg-slate-50/40 border-l border-slate-200">
                                      {formatINR(pyAmt)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                                <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wide">
                                  Total Note {def.noteNumber} ({def.name})
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-sm text-emerald-800 bg-emerald-100/60 border-l border-slate-300">
                                  CY Total: ₹{formatINR(totalAmt)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 bg-slate-200/60 border-l border-slate-300">
                                  PY Total: ₹{formatINR(schedule?.previousYearAmount || 0)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {/* Mandatory ICAI Disclosures */}
                      {def.mandatoryDisclosures && def.mandatoryDisclosures.length > 0 && (
                        <div className="mt-3 p-3 rounded-md bg-amber-50/60 border border-amber-200 text-xs text-amber-950">
                          <span className="font-semibold block mb-1">Statutory ICAI Disclosures:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900">
                            {def.mandatoryDisclosures.map((disc, idx) => (
                              <li key={idx}>{disc}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Note 5: Statutory Borrowings Footnotes (Page 7) */}
                      {def.noteNumber === 5 && (
                        <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-950 space-y-1">
                          <span className="font-bold block">Statutory ICAI Disclosure Footnotes (Page 7):</span>
                          <p>(i) Nature of the Security to be specified separately for each secured borrowing.</p>
                          <p>(ii) Terms of repayment of term loans and other loans shall be stated.</p>
                          <p>(iii) Where loans guaranteed by partners/proprietors/owners aggregate of such amount under each head shall be disclosed.</p>
                        </div>
                      )}


                      {/* Note 16: Trade Receivables Aging Schedule */}
                      {def.noteNumber === 16 && (() => {
                        const recTotalCY = schedule?.totalAmount || 0;
                        return (
                          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5 overflow-x-auto">
                            <h4 className="font-bold text-slate-900 uppercase tracking-wide pb-1 border-b border-slate-200">
                              Trade Receivables Aging Schedule as at {config.reportingPeriod}
                            </h4>
                            <table className="w-full text-left text-[11px] border-collapse">
                              <thead>
                                <tr className="bg-slate-200/80 text-slate-800 font-bold">
                                  <th className="py-2 px-3">Particulars</th>
                                  <th className="py-2 px-2 text-right">&lt; 6 Months</th>
                                  <th className="py-2 px-2 text-right">6 Mos - 1 Yr</th>
                                  <th className="py-2 px-2 text-right">1 - 2 Years</th>
                                  <th className="py-2 px-2 text-right">2 - 3 Years</th>
                                  <th className="py-2 px-2 text-right">&gt; 3 Years</th>
                                  <th className="py-2 px-3 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 text-slate-700">
                                <tr>
                                  <td className="py-1.5 px-3 font-medium">(i) Undisputed Trade receivables - considered good</td>
                                  <td className="py-1.5 px-2 text-right font-mono">{formatINR(recTotalCY)}</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-3 text-right font-mono font-bold">{formatINR(recTotalCY)}</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-3 font-medium">(ii) Undisputed - significant credit risk</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-3 text-right font-mono text-slate-400">₹0.00</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-3 font-medium">(iii) Undisputed - credit impaired</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-3 text-right font-mono text-slate-400">₹0.00</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-3 font-medium">(iv) Disputed - considered good</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-400">₹0.00</td>
                                  <td className="py-1.5 px-3 text-right font-mono text-slate-400">₹0.00</td>
                                </tr>
                                <tr className="bg-slate-100 font-bold text-slate-900">
                                  <td className="py-2 px-3">Total Trade Receivables</td>
                                  <td className="py-2 px-2 text-right font-mono">{formatINR(recTotalCY)}</td>
                                  <td className="py-2 px-2 text-right font-mono">₹0.00</td>
                                  <td className="py-2 px-2 text-right font-mono">₹0.00</td>
                                  <td className="py-2 px-2 text-right font-mono">₹0.00</td>
                                  <td className="py-2 px-2 text-right font-mono">₹0.00</td>
                                  <td className="py-2 px-3 text-right font-mono text-emerald-800">{formatINR(recTotalCY)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Note 3 Statutory Partner Capital Manager Modal */}
      <PartnerCapitalModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        config={config}
        onUpdateConfig={onUpdateConfig || (() => {})}
        noteSchedule={noteSchedules[3]}
        profitAndLoss={profitAndLoss}
      />

      {/* Note 9 Statutory Trade Payables MSME & Aging Manager Modal */}
      <TradePayablesMsmeModal
        isOpen={isTradePayablesModalOpen}
        onClose={() => setIsTradePayablesModalOpen(false)}
        config={config}
        onUpdateConfig={onUpdateConfig || (() => {})}
        noteSchedule={noteSchedules[9]}
      />
    </div>
  );
};
