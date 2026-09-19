import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight, FileText, CheckCircle2, Building, ShieldCheck, DollarSign, Box, Calculator } from 'lucide-react';
import { NoteScheduleData, EntityConfig } from '../types';
import { NCE_NOTE_DEFINITIONS } from '../data/nceTaxonomy';
import { isPartnersRemunerationItem } from '../utils/financialCalculations';

interface NotesViewProps {
  noteSchedules: Record<number, NoteScheduleData>;
  config: EntityConfig;
  selectedNoteNumber?: number;
  onOpenYearEndAdjustments?: () => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  noteSchedules,
  config,
  selectedNoteNumber,
  onOpenYearEndAdjustments,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'WITH_BALANCE' | 'BALANCE_SHEET' | 'PROFIT_LOSS' | 'POLICIES'>('ALL');
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

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
              <button
                onClick={() => toggleNote(def.noteNumber)}
                className="w-full text-left p-4 bg-slate-50/70 hover:bg-slate-50 transition flex items-center justify-between border-b border-slate-200"
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

                <div className="flex items-center gap-4 shrink-0">
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
              </button>

              {/* Note Expanded Body */}
              {isExpanded && (
                <div className="p-5 space-y-4">
                  {/* Note 1: Entity Overview & Domicile */}
                  {def.noteNumber === 1 && (
                    <div className="space-y-3 text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-lg border border-slate-200">
                      <p>
                        <strong>1.1 General Information:</strong> {config.entityName} is a {config.entityType} domiciled in India. The entity is engaged in manufacturing, trading, and contracting operations. The financial statements for the reporting period ended {config.reportingPeriod} (Comparative period ended {config.previousReportingPeriod || 'March 31, 2024'}) have been prepared in accordance with the Guidance Note on Financial Statements of Non-Corporate Entities issued by the Institute of Chartered Accountants of India (ICAI).
                      </p>
                      <p>
                        <strong>1.2 Entity Classification:</strong> For the purpose of applicability of Accounting Standards, the entity is classified as a Non-Corporate Entity (Level II / Level III) under ICAI criteria based on turnover and borrowings thresholds.
                      </p>
                      <p>
                        <strong>1.3 Rounding of Amounts:</strong> Figures have been stated in Indian Rupees (₹) rounded off to the nearest rupee. Comparative prior period figures have been regrouped/reclassified wherever necessary to conform to current period presentation.
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
                          const colonIdx = policyStr.indexOf(':');
                          const rawTitle = colonIdx > -1 ? policyStr.substring(0, colonIdx).trim() : `Policy 2.${pIdx + 1}`;
                          const desc = colonIdx > -1 ? policyStr.substring(colonIdx + 1).trim() : policyStr;
                          
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
                                        {isPartnersRemunerationItem(item) && (
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
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
