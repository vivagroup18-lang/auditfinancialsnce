import React, { useState } from 'react';
import {
  Building2,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Printer,
  ChevronRight,
  Download,
  Sliders,
} from 'lucide-react';
import {
  BalanceSheetData,
  ProfitAndLossData,
  NoteScheduleData,
  EntityConfig,
} from '../types';
import { NCE_NOTE_DEFINITIONS } from '../data/nceTaxonomy';

interface Step3ComparativeStatementsProps {
  config: EntityConfig;
  computedFinancials: {
    balanceSheet: BalanceSheetData;
    profitAndLoss: ProfitAndLossData;
    noteSchedules: Record<number, NoteScheduleData>;
  };
  onBackToStep2: () => void;
  onProceedToStep4: () => void;
  onSelectNote?: (noteNumber: number) => void;
  onOpenTradePayables?: () => void;
}

export const Step3ComparativeStatements: React.FC<Step3ComparativeStatementsProps> = ({
  config,
  computedFinancials,
  onBackToStep2,
  onProceedToStep4,
  onSelectNote = () => {},
  onOpenTradePayables,
}) => {
  const [statementType, setStatementType] = useState<'balance_sheet' | 'profit_loss' | 'notes_summary'>('balance_sheet');

  const bs = computedFinancials.balanceSheet;
  const pl = computedFinancials.profitAndLoss;
  const schedules = computedFinancials.noteSchedules;

  const isProprietor = config.entityType === 'Sole Proprietorship';
  const cyYear = config.financialYear || '2025-26';
  const pyYear = config.previousFinancialYear || '2024-25';
  const hasPY = bs.isPreviousYearUploaded;

  const formatINR = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPY = (val?: number) => {
    if (!hasPY) return '-';
    if (val === undefined || val === null || val === 0 || isNaN(val)) return '-';
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getVariance = (cy?: number, py?: number) => {
    if (cy === undefined || py === undefined || !hasPY || py === 0) return null;
    const diff = cy - py;
    const pct = ((diff / Math.abs(py)) * 100).toFixed(1);
    return { diff, pct: parseFloat(pct) };
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Step 3 of 5
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Consolidated Comparative Reporting • FY {cyYear} vs FY {pyYear}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Comparative Financial Statements & Notes
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Side-by-side comparative analysis of Balance Sheet, Profit & Loss, and statutory note movements under ICAI Non-Corporate Entity guidelines.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onBackToStep2}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Step 2</span>
            </button>

            <button
              type="button"
              onClick={onProceedToStep4}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <span>Proceed to Step 4: Notes & Audit Checks</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Statement Selector Tabs */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatementType('balance_sheet')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                statementType === 'balance_sheet'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Comparative Balance Sheet</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  bs.isBalanced ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}
              >
                {bs.isBalanced ? 'Balanced' : 'Imbalanced'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatementType('profit_loss')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                statementType === 'profit_loss'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              <span>Comparative Profit & Loss</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-700 font-bold">
                PAT: {formatINR(pl.profitAfterTax)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatementType('notes_summary')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                statementType === 'notes_summary'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Consolidated Notes (1–25)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Status:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
              {hasPY ? 'Full Comparative Ingested' : 'CY Only (Single Period)'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. COMPARATIVE BALANCE SHEET TABLE                                        */}
      {/* ========================================================================= */}
      {statementType === 'balance_sheet' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Comparative Balance Sheet as at {config.reportingPeriod || 'March 31, 2025'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Amounts stated in Indian Rupees (₹) • Prepared in accordance with ICAI Technical Guide
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                CY: ₹{bs.totalAssets.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              {hasPY && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
                  PY: ₹{(bs.previousYear?.totalAssets || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-1/2">Particulars</th>
                  <th className="py-3 px-3 text-center w-20">Note</th>
                  <th className="py-3 px-4 text-right">CY ({cyYear}) ₹</th>
                  <th className="py-3 px-4 text-right">PY ({pyYear}) ₹</th>
                  <th className="py-3 px-4 text-right">Variance (₹)</th>
                  <th className="py-3 px-4 text-right">YoY %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* EQUITY & LIABILITIES */}
                <tr className="bg-slate-100/80 font-black text-slate-900 text-xs">
                  <td colSpan={6} className="py-2.5 px-4 tracking-wide uppercase">
                    I. EQUITY AND LIABILITIES
                  </td>
                </tr>

                {/* (1) Owners' funds */}
                <tr className="bg-slate-50/60 font-bold text-slate-900">
                  <td colSpan={6} className="py-2 px-4 pl-6">(1) Owners' funds</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">
                    {config.entityType === 'Partnership Firm' || config.entityType === 'LLP'
                      ? "(a) Partners' Capital accounts"
                      : isProprietor
                      ? "(a) Proprietor's Capital account"
                      : "(a) Owners' Capital account"}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(3)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 3: Owners' / Partners' Capital Account"
                    >
                      3
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.ownersCapital)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.ownersCapital)}</td>
                  {(() => {
                    const v = getVariance(bs.ownersCapital, bs.previousYear?.ownersCapital);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">(b) Reserves and surplus</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(4)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 4: Reserves and Surplus"
                    >
                      4
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.reservesAndSurplus)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.reservesAndSurplus)}</td>
                  {(() => {
                    const v = getVariance(bs.reservesAndSurplus, bs.previousYear?.reservesAndSurplus);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* (2) Non-Current Liabilities */}
                <tr className="bg-slate-50/60 font-bold text-slate-900">
                  <td colSpan={6} className="py-2 px-4 pl-6">
                    (2) Non-current liabilities
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">(a) Long-term borrowings</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(5)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 5: Long-Term Borrowings"
                    >
                      5
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.longTermBorrowings)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.longTermBorrowings)}</td>
                  {(() => {
                    const v = getVariance(bs.longTermBorrowings, bs.previousYear?.longTermBorrowings);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">(b) Deferred tax liabilities (Net)</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(6)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 6: Deferred Tax Liabilities"
                    >
                      6
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.deferredTaxLiabilities || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.deferredTaxLiabilities || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.deferredTaxLiabilities || 0, bs.previousYear?.deferredTaxLiabilities || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">(c) Other long-term liabilities</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(7)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 7: Other Long-Term Liabilities"
                    >
                      7
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.otherLongTermLiabilities)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.otherLongTermLiabilities)}</td>
                  {(() => {
                    const v = getVariance(bs.otherLongTermLiabilities, bs.previousYear?.otherLongTermLiabilities);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">(d) Long-term provisions</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(8)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 8: Provisions (Long-Term Portion)"
                    >
                      8
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.longTermProvisions || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.longTermProvisions || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.longTermProvisions || 0, bs.previousYear?.longTermProvisions || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* (3) Current Liabilities */}
                <tr className="bg-slate-50/60 font-bold text-slate-900">
                  <td colSpan={6} className="py-2 px-4 pl-6">
                    (3) Current liabilities
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">(a) Short-term borrowings</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(5)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 5: Short-Term Borrowings"
                    >
                      5
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.shortTermBorrowings)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.shortTermBorrowings)}</td>
                  {(() => {
                    const v = getVariance(bs.shortTermBorrowings, bs.previousYear?.shortTermBorrowings);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 pl-10">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="font-semibold text-slate-900">(b) Trade payables</div>
                      {onOpenTradePayables && (
                        <button
                          type="button"
                          onClick={onOpenTradePayables}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-2xs transition cursor-pointer"
                          title="Enter MSME dues, Section 22 disclosures & aging schedule"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Edit Creditors MSME Data</span>
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal pl-3 mt-0.5">
                      (A) total outstanding dues of micro & small enterprises: <strong className="font-mono text-slate-700">{formatINR(bs.tradePayablesMsme || 0)}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal pl-3">
                      (B) total outstanding dues of other creditors: <strong className="font-mono text-slate-700">{formatINR(bs.tradePayablesOther || bs.tradePayables)}</strong>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center align-top pt-2.5">
                    <button
                      type="button"
                      onClick={() => onSelectNote(9)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 9: Trade Payables"
                    >
                      9
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono align-top pt-2.5">{formatINR(bs.tradePayables)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500 align-top pt-2.5">{formatPY(bs.previousYear?.tradePayables)}</td>
                  {(() => {
                    const v = getVariance(bs.tradePayables, bs.previousYear?.tradePayables);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono align-top pt-2.5">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold align-top pt-2.5">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">(c) Other current liabilities</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(10)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 10: Other Current Liabilities"
                    >
                      10
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.otherCurrentLiabilities)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.otherCurrentLiabilities)}</td>
                  {(() => {
                    const v = getVariance(bs.otherCurrentLiabilities, bs.previousYear?.otherCurrentLiabilities);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">(d) Short-term provisions</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(8)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 8: Provisions (Short-Term Portion)"
                    >
                      8
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.shortTermProvisions)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.shortTermProvisions)}</td>
                  {(() => {
                    const v = getVariance(bs.shortTermProvisions, bs.previousYear?.shortTermProvisions);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Total Equity & Liabilities */}
                <tr className="bg-emerald-100 font-black text-emerald-950 text-xs border-t-2 border-b-2 border-emerald-300">
                  <td className="py-3 px-4 uppercase tracking-wide">TOTAL EQUITY AND LIABILITIES</td>
                  <td className="py-3 px-3 text-center">-</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">{formatINR(bs.totalEquityAndLiabilities)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{formatPY(bs.previousYear?.totalEquityAndLiabilities)}</td>
                  {(() => {
                    const v = getVariance(bs.totalEquityAndLiabilities, bs.previousYear?.totalEquityAndLiabilities);
                    return (
                      <>
                        <td className="py-3 px-4 text-right font-mono font-bold">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-3 px-4 text-right font-black">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* ASSETS */}
                <tr className="bg-slate-100/80 font-black text-slate-900 text-xs">
                  <td colSpan={6} className="py-2.5 px-4 tracking-wide uppercase">
                    II. ASSETS
                  </td>
                </tr>

                {/* (1) Non-current assets */}
                <tr className="bg-slate-50/60 font-bold text-slate-900">
                  <td colSpan={6} className="py-2 px-4 pl-6">
                    (1) Non-current assets
                  </td>
                </tr>
                <tr className="bg-slate-50/30 font-semibold text-slate-800">
                  <td colSpan={6} className="py-1.5 px-4 pl-8">
                    (a) Property, Plant and Equipment and Intangible assets
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-12">(i) Property, Plant and Equipment</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(11)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 11: Property, Plant and Equipment"
                    >
                      11
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.propertyPlantEquipment)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.propertyPlantEquipment)}</td>
                  {(() => {
                    const v = getVariance(bs.propertyPlantEquipment, bs.previousYear?.propertyPlantEquipment);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-12">(ii) Intangible assets</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(11)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 11: Intangible Assets"
                    >
                      11
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.intangibleAssets || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.intangibleAssets || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.intangibleAssets || 0, bs.previousYear?.intangibleAssets || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-12">(iii) Capital work in progress</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(11)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 11: Capital Work in Progress"
                    >
                      11
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.capitalWorkInProgress || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.capitalWorkInProgress || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.capitalWorkInProgress || 0, bs.previousYear?.capitalWorkInProgress || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-12">(iv) Intangible asset under development</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(11)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 11: Intangible Asset under Development"
                    >
                      11
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.intangibleAssetUnderDevelopment || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.intangibleAssetUnderDevelopment || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.intangibleAssetUnderDevelopment || 0, bs.previousYear?.intangibleAssetUnderDevelopment || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">(b) Non-current investments</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(12)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 12: Investments (Non-Current)"
                    >
                      12
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.nonCurrentInvestments || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.nonCurrentInvestments || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.nonCurrentInvestments || 0, bs.previousYear?.nonCurrentInvestments || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">(c) Deferred tax assets (net)</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(6)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 6: Deferred Tax Assets"
                    >
                      6
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.deferredTaxAssets || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.deferredTaxAssets || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.deferredTaxAssets || 0, bs.previousYear?.deferredTaxAssets || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">(d) Long-term loans and advances</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(13)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 13: Loans and Advances (Long-Term)"
                    >
                      13
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.longTermLoansAndAdvances || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.longTermLoansAndAdvances || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.longTermLoansAndAdvances || 0, bs.previousYear?.longTermLoansAndAdvances || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">(e) Other non-current assets</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(14)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 14: Other Non-Current Assets"
                    >
                      14
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.otherNonCurrentAssets || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.otherNonCurrentAssets || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.otherNonCurrentAssets || 0, bs.previousYear?.otherNonCurrentAssets || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* (2) Current Assets */}
                <tr className="bg-slate-50/60 font-bold text-slate-900">
                  <td colSpan={6} className="py-2 px-4 pl-6">
                    (2) Current assets
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">(a) Current investments</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(12)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 12: Investments (Current Portion)"
                    >
                      12
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.currentInvestments || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.currentInvestments || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.currentInvestments || 0, bs.previousYear?.currentInvestments || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">(b) Inventories</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(15)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 15: Inventories"
                    >
                      15
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.inventories || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.inventories || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.inventories || 0, bs.previousYear?.inventories || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">(c) Trade receivables</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(16)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 16: Trade Receivables"
                    >
                      16
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.tradeReceivables || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.tradeReceivables || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.tradeReceivables || 0, bs.previousYear?.tradeReceivables || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">(d) Cash and bank balances</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(17)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 17: Cash and Bank Balances"
                    >
                      17
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.cashAndBankBalances || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.cashAndBankBalances || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.cashAndBankBalances || 0, bs.previousYear?.cashAndBankBalances || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">(e) Short-term loans and advances</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(13)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 13: Loans and Advances (Short-Term Portion)"
                    >
                      13
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.shortTermLoansAndAdvances || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.shortTermLoansAndAdvances || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.shortTermLoansAndAdvances || 0, bs.previousYear?.shortTermLoansAndAdvances || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">(f) Other current assets</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(18)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 18: Other Current Assets"
                    >
                      18
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.otherCurrentAssets || 0)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.otherCurrentAssets || 0)}</td>
                  {(() => {
                    const v = getVariance(bs.otherCurrentAssets || 0, bs.previousYear?.otherCurrentAssets || 0);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Total Assets */}
                <tr className="bg-emerald-100 font-black text-emerald-950 text-xs border-t-2 border-b-2 border-emerald-300">
                  <td className="py-3 px-4 uppercase tracking-wide">TOTAL ASSETS</td>
                  <td className="py-3 px-3 text-center">-</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">{formatINR(bs.totalAssets)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{formatPY(bs.previousYear?.totalAssets)}</td>
                  {(() => {
                    const v = getVariance(bs.totalAssets, bs.previousYear?.totalAssets);
                    return (
                      <>
                        <td className="py-3 px-4 text-right font-mono font-bold">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-3 px-4 text-right font-black">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Statutory References as per ICAI Page 3 */}
                <tr className="bg-slate-50/80 text-slate-700 font-semibold text-xs border-t border-slate-200">
                  <td className="py-2.5 px-4 pl-6">Brief about the Entity</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(1)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 1: Brief about the Entity"
                    >
                      1
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                </tr>
                <tr className="bg-slate-50/80 text-slate-700 font-semibold text-xs">
                  <td className="py-2.5 px-4 pl-6">Summary of significant accounting policies</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(2)}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 2: Significant Accounting Policies"
                    >
                      2
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                </tr>
                <tr className="bg-slate-50 text-slate-600 font-medium text-[11px] italic">
                  <td colSpan={6} className="py-2 px-4">
                    The accompanying notes are an integral part of the financial statements
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPARATIVE PROFIT AND LOSS TABLE                                      */}
      {/* ========================================================================= */}
      {statementType === 'profit_loss' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Comparative Statement of Profit and Loss for the year ended {config.reportingPeriod || 'March 31, 2025'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Amounts stated in Indian Rupees (₹) • Prepared in accordance with ICAI Technical Guide
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                Revenue: ₹{pl.revenueFromOperations.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
                PAT: ₹{pl.profitAfterTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-1/2">Particulars</th>
                  <th className="py-3 px-3 text-center w-20">Note</th>
                  <th className="py-3 px-4 text-right">CY ({cyYear}) ₹</th>
                  <th className="py-3 px-4 text-right">PY ({pyYear}) ₹</th>
                  <th className="py-3 px-4 text-right">Variance (₹)</th>
                  <th className="py-3 px-4 text-right">YoY %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* Revenue */}
                <tr className="font-semibold">
                  <td className="py-2.5 px-4 pl-6">I. Revenue from Operations</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(19)}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 19: Revenue from Operations"
                    >
                      19
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatINR(pl.revenueFromOperations)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatPY(pl.previousYear?.revenueFromOperations)}</td>
                  {(() => {
                    const v = getVariance(pl.revenueFromOperations, pl.previousYear?.revenueFromOperations);
                    return (
                      <>
                        <td className="py-2.5 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Other Income */}
                <tr className="font-semibold">
                  <td className="py-2.5 px-4 pl-6">II. Other Income</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(20)}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 20: Other Income"
                    >
                      20
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatINR(pl.otherIncome)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatPY(pl.previousYear?.otherIncome)}</td>
                  {(() => {
                    const v = getVariance(pl.otherIncome, pl.previousYear?.otherIncome);
                    return (
                      <>
                        <td className="py-2.5 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Total Income */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t border-b border-slate-200">
                  <td className="py-2.5 px-4 uppercase tracking-wide">III. TOTAL INCOME (I + II)</td>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold">{formatINR(pl.totalRevenue)}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700">{formatPY(pl.previousYear?.totalRevenue)}</td>
                  {(() => {
                    const v = getVariance(pl.totalRevenue, pl.previousYear?.totalRevenue);
                    return (
                      <>
                        <td className="py-2.5 px-4 text-right font-mono font-bold">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* EXPENSES */}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td colSpan={6} className="py-2 px-4 uppercase tracking-wide">
                    IV. EXPENSES:
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">
                    <div>Cost of goods sold</div>
                    <div className="text-[11px] text-slate-500 font-normal pl-3">
                      (a) Cost of materials consumed: {formatINR(pl.costOfRawMaterialsConsumed)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal pl-3">
                      (b) Purchases of Stock-in-Trade: {formatINR(pl.purchasesOfStockInTrade || 0)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal pl-3">
                      (c) Changes in inventories of finished goods, WIP & Stock: {formatINR(pl.changesInInventories)}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center align-top pt-2.5">
                    <button
                      type="button"
                      onClick={() => onSelectNote(21)}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 21: Cost of Goods Sold"
                    >
                      21
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono align-top pt-2.5">{formatINR(pl.costOfGoodsSold)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500 align-top pt-2.5">{formatPY(pl.previousYear?.costOfGoodsSold)}</td>
                  {(() => {
                    const v = getVariance(pl.costOfGoodsSold, pl.previousYear?.costOfGoodsSold);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono align-top pt-2.5">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold align-top pt-2.5">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">Employee benefits expense</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(22)}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 22: Employee Benefits Expense"
                    >
                      22
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(pl.employeeBenefitsExpense)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(pl.previousYear?.employeeBenefitsExpense)}</td>
                  {(() => {
                    const v = getVariance(pl.employeeBenefitsExpense, pl.previousYear?.employeeBenefitsExpense);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">Finance costs</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(23)}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 23: Finance Costs"
                    >
                      23
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(pl.financeCosts)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(pl.previousYear?.financeCosts)}</td>
                  {(() => {
                    const v = getVariance(pl.financeCosts, pl.previousYear?.financeCosts);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">Depreciation and amortization expense</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(24)}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 24: Depreciation and Amortization Expense"
                    >
                      24
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(pl.depreciationExpense)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(pl.previousYear?.depreciationExpense)}</td>
                  {(() => {
                    const v = getVariance(pl.depreciationExpense, pl.previousYear?.depreciationExpense);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">Other expenses</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(25)}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 25: Other Expenses"
                    >
                      25
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(pl.otherExpenses)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(pl.previousYear?.otherExpenses)}</td>
                  {(() => {
                    const v = getVariance(pl.otherExpenses, pl.previousYear?.otherExpenses);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Total Expenses */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t border-b border-slate-200">
                  <td className="py-2.5 px-4 uppercase tracking-wide">TOTAL EXPENSES (IV)</td>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold">{formatINR(pl.totalExpenses)}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700">{formatPY(pl.previousYear?.totalExpenses)}</td>
                  {(() => {
                    const v = getVariance(pl.totalExpenses, pl.previousYear?.totalExpenses);
                    return (
                      <>
                        <td className="py-2.5 px-4 text-right font-mono font-bold">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* V. Profit/(loss) before exceptional and extraordinary items, partners' remuneration and tax (III- IV) */}
                <tr className="font-semibold text-slate-900 bg-slate-50/70">
                  <td className="py-2.5 px-4 pl-6">
                    {isProprietor
                      ? "V. Profit/(loss) before exceptional and extraordinary items and tax (III- IV)"
                      : "V. Profit/(loss) before exceptional and extraordinary items, partners' remuneration and tax (III- IV)"}
                  </td>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold">{formatINR(pl.profitBeforeExceptionalAndTax)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-semibold">{formatPY(pl.previousYear?.profitBeforeExceptionalAndTax)}</td>
                  {(() => {
                    const v = getVariance(pl.profitBeforeExceptionalAndTax, pl.previousYear?.profitBeforeExceptionalAndTax);
                    return (
                      <>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* VI. Exceptional items */}
                <tr className="hover:bg-slate-50 transition-colors text-slate-700">
                  <td className="py-2 px-4 pl-8">VI. Exceptional items (specify nature &amp; provide note/delete if none)</td>
                  <td className="py-2 px-3 text-center">-</td>
                  <td className="py-2 px-4 text-right font-mono">{pl.exceptionalItems ? formatINR(pl.exceptionalItems) : '-'}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{pl.previousYear?.exceptionalItems ? formatPY(pl.previousYear.exceptionalItems) : '-'}</td>
                  {(() => {
                    const v = getVariance(pl.exceptionalItems, pl.previousYear?.exceptionalItems);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* VII. Profit/(loss) before extraordinary items, partners' remuneration and tax (V-VI) */}
                <tr className="hover:bg-slate-50 transition-colors text-slate-700">
                  <td className="py-2.5 px-4 pl-6">
                    {isProprietor
                      ? "VII. Profit/(loss) before extraordinary items and tax (V-VI)"
                      : "VII. Profit/(loss) before extraordinary items, partners' remuneration and tax (V-VI)"}
                  </td>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-4 text-right font-mono font-medium">{formatINR(pl.profitBeforeExtraordinaryAndTax)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-medium">{formatPY(pl.previousYear?.profitBeforeExtraordinaryAndTax)}</td>
                  {(() => {
                    const v = getVariance(pl.profitBeforeExtraordinaryAndTax, pl.previousYear?.profitBeforeExtraordinaryAndTax);
                    return (
                      <>
                        <td className="py-2.5 px-4 text-right font-mono font-medium">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* VIII. Extraordinary Items */}
                <tr className="hover:bg-slate-50 transition-colors text-slate-700">
                  <td className="py-2 px-4 pl-8">VIII. Extraordinary Items (specify nature &amp; provide note/delete if none)</td>
                  <td className="py-2 px-3 text-center">-</td>
                  <td className="py-2 px-4 text-right font-mono">{pl.extraordinaryItems ? formatINR(pl.extraordinaryItems) : '-'}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{pl.previousYear?.extraordinaryItems ? formatPY(pl.previousYear.extraordinaryItems) : '-'}</td>
                  {(() => {
                    const v = getVariance(pl.extraordinaryItems, pl.previousYear?.extraordinaryItems);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Proprietor: IX. PROFIT BEFORE TAX (VII - VIII) */}
                {isProprietor ? (
                  <tr className="font-black text-slate-950 bg-slate-100 border-t-2 border-b-2 border-slate-300">
                    <td className="py-3 px-4 uppercase tracking-wide">IX. PROFIT BEFORE TAX (VII - VIII)</td>
                    <td className="py-3 px-3 text-center">-</td>
                    <td className="py-3 px-4 text-right font-mono font-black">{formatINR(pl.profitBeforeTax)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{formatPY(pl.previousYear?.profitBeforeTax)}</td>
                    {(() => {
                      const v = getVariance(pl.profitBeforeTax, pl.previousYear?.profitBeforeTax);
                      return (
                        <>
                          <td className="py-3 px-4 text-right font-mono font-bold">{v ? formatINR(v.diff) : '-'}</td>
                          <td className="py-3 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                        </>
                      );
                    })()}
                  </tr>
                ) : (
                  <>
                    {/* Non-Proprietor: IX. Profit before, partners' remuneration and tax (VII-VIII) */}
                    <tr className="bg-amber-50/60 font-bold text-amber-950 border-t border-b border-amber-200">
                      <td className="py-2.5 px-4 pl-6">
                        IX. Profit before, partners' remuneration and tax (VII-VIII)
                      </td>
                      <td className="py-2.5 px-3 text-center">-</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-900">{formatINR(pl.profitBeforePartnersRemunerationAndTax)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700">{formatPY(pl.previousYear?.profitBeforePartnersRemunerationAndTax)}</td>
                      {(() => {
                        const v = getVariance(pl.profitBeforePartnersRemunerationAndTax, pl.previousYear?.profitBeforePartnersRemunerationAndTax);
                        return (
                          <>
                            <td className="py-2.5 px-4 text-right font-mono font-bold">{v ? formatINR(v.diff) : '-'}</td>
                            <td className="py-2.5 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                          </>
                        );
                      })()}
                    </tr>

                    {/* X. Partners’ remuneration* */}
                    <tr className="bg-emerald-50/50 hover:bg-emerald-50 font-semibold text-emerald-950">
                      <td className="py-2.5 px-4 pl-6 flex items-center gap-2">
                        <span>X. Partners’ remuneration*</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Sec 40(b)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectNote(22)}
                          className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 hover:bg-emerald-200 text-[10px] font-black transition border border-emerald-300 cursor-pointer inline-flex items-center"
                          title="View Note 22: Partners' Remuneration"
                        >
                          *
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-900">
                        {pl.partnersRemuneration > 0 ? formatINR(pl.partnersRemuneration) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600 font-semibold">
                        {pl.previousYear?.partnersRemuneration ? formatPY(pl.previousYear.partnersRemuneration) : '-'}
                      </td>
                      {(() => {
                        const v = getVariance(pl.partnersRemuneration, pl.previousYear?.partnersRemuneration);
                        return (
                          <>
                            <td className="py-2.5 px-4 text-right font-mono font-bold">{v ? formatINR(v.diff) : '-'}</td>
                            <td className="py-2.5 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                          </>
                        );
                      })()}
                    </tr>

                    {/* XI. Profit before tax (IX- X) */}
                    <tr className="font-black text-slate-950 bg-slate-100 border-t-2 border-b-2 border-slate-300">
                      <td className="py-3 px-4 uppercase tracking-wide">XI. PROFIT BEFORE TAX (IX - X)</td>
                      <td className="py-3 px-3 text-center">-</td>
                      <td className="py-3 px-4 text-right font-mono font-black">{formatINR(pl.profitBeforeTax)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{formatPY(pl.previousYear?.profitBeforeTax)}</td>
                      {(() => {
                        const v = getVariance(pl.profitBeforeTax, pl.previousYear?.profitBeforeTax);
                        return (
                          <>
                            <td className="py-3 px-4 text-right font-mono font-bold">{v ? formatINR(v.diff) : '-'}</td>
                            <td className="py-3 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                          </>
                        );
                      })()}
                    </tr>
                  </>
                )}

                {/* Tax Expense: Line X for Proprietorship, Line XII for non-proprietorship */}
                <tr className="font-semibold text-slate-900 bg-slate-50/40">
                  <td colSpan={6} className="py-2 px-4 pl-6">{isProprietor ? "X. Tax expense:" : "XII. Tax expense:"}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">(1) Current tax</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(8)}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 8: Current Tax Provision"
                    >
                      8
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(pl.currentTax)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(pl.previousYear?.currentTax)}</td>
                  {(() => {
                    const v = getVariance(pl.currentTax, pl.previousYear?.currentTax);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">(2) Excess/ Short provision of tax relating to earlier years</td>
                  <td className="py-2 px-3 text-center">-</td>
                  <td className="py-2 px-4 text-right font-mono">{pl.excessShortTaxEarlierYears ? formatINR(pl.excessShortTaxEarlierYears) : '-'}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{pl.previousYear?.excessShortTaxEarlierYears ? formatPY(pl.previousYear.excessShortTaxEarlierYears) : '-'}</td>
                  {(() => {
                    const v = getVariance(pl.excessShortTaxEarlierYears, pl.previousYear?.excessShortTaxEarlierYears);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">(3) Deferred tax charge/ (benefit)</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(6)}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition cursor-pointer"
                      title="View Note 6: Deferred Tax"
                    >
                      6
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(pl.deferredTax)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(pl.previousYear?.deferredTax)}</td>
                  {(() => {
                    const v = getVariance(pl.deferredTax, pl.previousYear?.deferredTax);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Continuing operations: Line XI for Proprietorship, Line XIII for non-proprietorship */}
                <tr className="hover:bg-slate-50 transition-colors font-semibold text-slate-800">
                  <td className="py-2 px-4 pl-6">
                    {isProprietor
                      ? "XI. Profit/(Loss) for the period from continuing operations (IX - X)"
                      : "XIII. Profit/(Loss) for the period from continuing operations (XI-XII)"}
                  </td>
                  <td className="py-2 px-3 text-center">-</td>
                  <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">{formatINR(pl.profitFromContinuingOps)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500 font-bold">{formatPY(pl.previousYear?.profitAfterTax)}</td>
                  {(() => {
                    const v = getVariance(pl.profitFromContinuingOps, pl.previousYear?.profitAfterTax);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono font-bold">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Discontinuing operations */}
                <tr className="hover:bg-slate-50 transition-colors text-slate-700">
                  <td className="py-2 px-4 pl-6">
                    {isProprietor ? "XII. Profit/(loss) from discontinuing operations" : "XIV. Profit/(loss) from discontinuing operations"}
                  </td>
                  <td className="py-2 px-3 text-center">-</td>
                  <td className="py-2 px-4 text-right font-mono">{pl.profitFromDiscontinuingOps ? formatINR(pl.profitFromDiscontinuingOps) : '-'}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">-</td>
                  <td className="py-2 px-4 text-right font-mono">-</td>
                  <td className="py-2 px-4 text-right font-bold">-</td>
                </tr>

                <tr className="hover:bg-slate-50 transition-colors text-slate-700">
                  <td className="py-2 px-4 pl-6">
                    {isProprietor ? "XIII. Tax expense of discontinuing operations" : "XV. Tax expense of discontinuing operations"}
                  </td>
                  <td className="py-2 px-3 text-center">-</td>
                  <td className="py-2 px-4 text-right font-mono">{pl.taxExpenseDiscontinuingOps ? formatINR(pl.taxExpenseDiscontinuingOps) : '-'}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">-</td>
                  <td className="py-2 px-4 text-right font-mono">-</td>
                  <td className="py-2 px-4 text-right font-bold">-</td>
                </tr>

                <tr className="hover:bg-slate-50 transition-colors text-slate-700">
                  <td className="py-2 px-4 pl-6">
                    {isProprietor
                      ? "XIV. Profit/(loss) from discontinuing operations (after tax) (XII-XIII)"
                      : "XVI. Profit/(loss) from discontinuing operations (after tax) (XIV-XV)"}
                  </td>
                  <td className="py-2 px-3 text-center">-</td>
                  <td className="py-2 px-4 text-right font-mono">{pl.profitFromDiscontinuingOpsAfterTax ? formatINR(pl.profitFromDiscontinuingOpsAfterTax) : '-'}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">-</td>
                  <td className="py-2 px-4 text-right font-mono">-</td>
                  <td className="py-2 px-4 text-right font-bold">-</td>
                </tr>

                {/* Final Profit for the year */}
                <tr className="bg-emerald-100 font-black text-emerald-950 text-xs border-t-2 border-b-2 border-emerald-300">
                  <td className="py-3 px-4 uppercase tracking-wide">
                    {isProprietor
                      ? "XV. PROFIT / (LOSS) FOR THE YEAR (XI + XIV)"
                      : "XVII. PROFIT / (LOSS) FOR THE YEAR (XIII + XVI)"}
                  </td>
                  <td className="py-3 px-3 text-center">-</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-950">{formatINR(pl.profitAfterTax)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{formatPY(pl.previousYear?.profitAfterTax)}</td>
                  {(() => {
                    const v = getVariance(pl.profitAfterTax, pl.previousYear?.profitAfterTax);
                    return (
                      <>
                        <td className="py-3 px-4 text-right font-mono font-bold">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-3 px-4 text-right font-black">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* ICAI Guidance Note Statutory Disclosures & Footnotes */}
                <tr className="bg-slate-50/70 text-slate-500 text-[11px] italic">
                  <td colSpan={6} className="py-2 px-4">
                    * wherever applicable
                  </td>
                </tr>
                <tr className="bg-slate-50 text-slate-700 font-semibold text-xs border-t border-slate-200">
                  <td colSpan={6} className="py-2.5 px-4">
                    The accompanying notes are an integral part of the financial statements
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CONSOLIDATED ALL 25 NOTES SUMMARY TABLE                                 */}
      {/* ========================================================================= */}
      {statementType === 'notes_summary' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Consolidated Statutory Notes Summary (Notes 1 to 25)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of total balances and year-on-year movements across all ICAI Schedule Notes
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
              25 Notes Configured
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-16">Note</th>
                  <th className="py-3 px-4">Schedule Description</th>
                  <th className="py-3 px-3 text-center w-28">Statement</th>
                  <th className="py-3 px-4 text-right">CY ({cyYear}) ₹</th>
                  <th className="py-3 px-4 text-right">PY ({pyYear}) ₹</th>
                  <th className="py-3 px-4 text-right">Movement (₹)</th>
                  <th className="py-3 px-3 text-center w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {NCE_NOTE_DEFINITIONS.map((def) => {
                  const schedule = schedules[def.noteNumber];
                  const cyVal = schedule?.totalAmount ?? 0;
                  const pyVal = schedule?.previousYearAmount ?? 0;
                  const diff = cyVal - pyVal;

                  return (
                    <tr key={def.noteNumber} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 inline-flex items-center justify-center font-mono">
                          {def.noteNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {def.name}
                        {def.noteNumber <= 2 && (
                          <span className="ml-2 text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-normal">
                            Mandatory Disclosure
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            def.statement === 'BalanceSheet'
                              ? 'bg-amber-50 text-amber-900 border border-amber-300'
                              : def.statement === 'ProfitAndLoss'
                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {def.statement === 'BalanceSheet' ? 'BS' : def.statement === 'ProfitAndLoss' ? 'P & L' : 'General'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium">{formatINR(cyVal)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatPY(pyVal)}</td>
                      <td className={`py-2.5 px-4 text-right font-mono font-bold ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                        {hasPY ? formatINR(diff) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectNote(def.noteNumber)}
                          className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold hover:underline cursor-pointer"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Step Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToStep2}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Step 2: Previous Year</span>
        </button>

        <div className="text-xs text-slate-500">
          Step 3 of 5 • Comparative Statements
        </div>

        <button
          type="button"
          onClick={onProceedToStep4}
          className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <span>Proceed to Step 4: Statutory Notes (1–25) & Audit Checks</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
