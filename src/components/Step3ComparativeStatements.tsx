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
}

export const Step3ComparativeStatements: React.FC<Step3ComparativeStatementsProps> = ({
  config,
  computedFinancials,
  onBackToStep2,
  onProceedToStep4,
  onSelectNote = () => {},
}) => {
  const [statementType, setStatementType] = useState<'balance_sheet' | 'profit_loss' | 'notes_summary'>('balance_sheet');

  const bs = computedFinancials.balanceSheet;
  const pl = computedFinancials.profitAndLoss;
  const schedules = computedFinancials.noteSchedules;

  const cyYear = config.financialYear;
  const pyYear = config.previousFinancialYear || '2023-24';
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

                {/* Owners Funds */}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="py-2 px-4 pl-6">(1) Owners' Funds / Partners' Capital</td>
                  <td className="py-2 px-3 text-center">3</td>
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

                {/* Reserves & Surplus */}
                <tr>
                  <td className="py-2 px-4 pl-6">(2) Reserves and Surplus</td>
                  <td className="py-2 px-3 text-center">4</td>
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

                {/* Non-Current Liabilities */}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td colSpan={6} className="py-2 px-4 pl-6">
                    (3) Non-Current Liabilities
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">Long-term borrowings</td>
                  <td className="py-2 px-3 text-center">5</td>
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
                  <td className="py-2 px-4 pl-10">Other long-term liabilities &amp; provisions</td>
                  <td className="py-2 px-3 text-center">6</td>
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

                {/* Current Liabilities */}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td colSpan={6} className="py-2 px-4 pl-6">
                    (4) Current Liabilities
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">Short-term borrowings</td>
                  <td className="py-2 px-3 text-center">7</td>
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
                  <td className="py-2 px-4 pl-10">Trade payables (Creditors)</td>
                  <td className="py-2 px-3 text-center">8</td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.tradePayables)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.tradePayables)}</td>
                  {(() => {
                    const v = getVariance(bs.tradePayables, bs.previousYear?.tradePayables);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">Other current liabilities</td>
                  <td className="py-2 px-3 text-center">9</td>
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
                  <td className="py-2 px-4 pl-10">Short-term provisions</td>
                  <td className="py-2 px-3 text-center">10</td>
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
                  <td className="py-3 px-4">TOTAL EQUITY AND LIABILITIES</td>
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

                {/* Property Plant & Equipment */}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td colSpan={6} className="py-2 px-4 pl-6">
                    (1) Non-Current Assets
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">Property, Plant and Equipment</td>
                  <td className="py-2 px-3 text-center">11</td>
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
                  <td className="py-2 px-4 pl-10">Non-current investments &amp; other non-current assets</td>
                  <td className="py-2 px-3 text-center">12</td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.nonCurrentInvestments + bs.longTermLoansAndAdvances + bs.otherNonCurrentAssets)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">
                    {formatPY(
                      (bs.previousYear?.nonCurrentInvestments || 0) +
                      (bs.previousYear?.longTermLoansAndAdvances || 0) +
                      (bs.previousYear?.otherNonCurrentAssets || 0)
                    )}
                  </td>
                  {(() => {
                    const cyVal = bs.nonCurrentInvestments + bs.longTermLoansAndAdvances + bs.otherNonCurrentAssets;
                    const pyVal = (bs.previousYear?.nonCurrentInvestments || 0) +
                                  (bs.previousYear?.longTermLoansAndAdvances || 0) +
                                  (bs.previousYear?.otherNonCurrentAssets || 0);
                    const v = getVariance(cyVal, pyVal);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Current Assets */}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td colSpan={6} className="py-2 px-4 pl-6">
                    (2) Current Assets
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">Inventories</td>
                  <td className="py-2 px-3 text-center">15</td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.inventories)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.inventories)}</td>
                  {(() => {
                    const v = getVariance(bs.inventories, bs.previousYear?.inventories);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">Trade receivables (Debtors)</td>
                  <td className="py-2 px-3 text-center">16</td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.tradeReceivables)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.tradeReceivables)}</td>
                  {(() => {
                    const v = getVariance(bs.tradeReceivables, bs.previousYear?.tradeReceivables);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">Cash and bank balances</td>
                  <td className="py-2 px-3 text-center">17</td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.cashAndBankBalances)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(bs.previousYear?.cashAndBankBalances)}</td>
                  {(() => {
                    const v = getVariance(bs.cashAndBankBalances, bs.previousYear?.cashAndBankBalances);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-10">Short-term loans, advances &amp; other current assets</td>
                  <td className="py-2 px-3 text-center">18</td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(bs.shortTermLoansAndAdvances + bs.otherCurrentAssets)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">
                    {formatPY(
                      (bs.previousYear?.shortTermLoansAndAdvances || 0) +
                      (bs.previousYear?.otherCurrentAssets || 0)
                    )}
                  </td>
                  {(() => {
                    const cyVal = bs.shortTermLoansAndAdvances + bs.otherCurrentAssets;
                    const pyVal = (bs.previousYear?.shortTermLoansAndAdvances || 0) +
                                  (bs.previousYear?.otherCurrentAssets || 0);
                    const v = getVariance(cyVal, pyVal);
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
                  <td className="py-3 px-4">TOTAL ASSETS</td>
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
                  <td className="py-2.5 px-3 text-center">19</td>
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
                  <td className="py-2.5 px-3 text-center">20</td>
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

                {/* Total Revenue */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t border-b border-slate-200">
                  <td className="py-2.5 px-4">III. TOTAL REVENUE (I + II)</td>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatINR(pl.totalRevenue)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-700">{formatPY(pl.previousYear?.totalRevenue)}</td>
                  {(() => {
                    const v = getVariance(pl.totalRevenue, pl.previousYear?.totalRevenue);
                    return (
                      <>
                        <td className="py-2.5 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* EXPENSES */}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td colSpan={6} className="py-2 px-4">
                    IV. EXPENSES
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">Cost of materials consumed / purchases</td>
                  <td className="py-2 px-3 text-center">21</td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(pl.costOfMaterialsConsumed)}</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(pl.previousYear?.costOfMaterialsConsumed)}</td>
                  {(() => {
                    const v = getVariance(pl.costOfMaterialsConsumed, pl.previousYear?.costOfMaterialsConsumed);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>
                <tr>
                  <td className="py-2 px-4 pl-8">Employee benefits expense</td>
                  <td className="py-2 px-3 text-center">22</td>
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
                  <td className="py-2 px-3 text-center">23</td>
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
                  <td className="py-2 px-3 text-center">24</td>
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
                  <td className="py-2 px-3 text-center">25</td>
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
                  <td className="py-2.5 px-4">TOTAL EXPENSES</td>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatINR(pl.totalExpenses)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-700">{formatPY(pl.previousYear?.totalExpenses)}</td>
                  {(() => {
                    const v = getVariance(pl.totalExpenses, pl.previousYear?.totalExpenses);
                    return (
                      <>
                        <td className="py-2.5 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Profit Before Tax */}
                <tr className="font-bold text-slate-900">
                  <td className="py-2.5 px-4">V. Profit Before Tax (PBT)</td>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatINR(pl.profitBeforeTax)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-700">{formatPY(pl.previousYear?.profitBeforeTax)}</td>
                  {(() => {
                    const v = getVariance(pl.profitBeforeTax, pl.previousYear?.profitBeforeTax);
                    return (
                      <>
                        <td className="py-2.5 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Tax Expense */}
                <tr>
                  <td className="py-2 px-4 pl-8">VI. Tax expense (Current Tax Provision)</td>
                  <td className="py-2 px-3 text-center">-</td>
                  <td className="py-2 px-4 text-right font-mono">{formatINR(pl.totalTaxExpense)}</td>
                  {(() => {
                    const pyTax = pl.previousYear ? ((pl.previousYear.currentTax || 0) + (pl.previousYear.deferredTaxCharge || 0)) : undefined;
                    const v = getVariance(pl.totalTaxExpense, pyTax);
                    return (
                      <>
                        <td className="py-2 px-4 text-right font-mono text-slate-500">{formatPY(pyTax)}</td>
                        <td className="py-2 px-4 text-right font-mono">{v ? formatINR(v.diff) : '-'}</td>
                        <td className="py-2 px-4 text-right font-bold">{v ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : '-'}</td>
                      </>
                    );
                  })()}
                </tr>

                {/* Profit After Tax */}
                <tr className="bg-emerald-100 font-black text-emerald-950 text-xs border-t-2 border-b-2 border-emerald-300">
                  <td className="py-3 px-4">VII. PROFIT FOR THE YEAR (PAT)</td>
                  <td className="py-3 px-3 text-center">-</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">{formatINR(pl.profitAfterTax)}</td>
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
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : def.statement === 'ProfitAndLoss'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {def.statement === 'BalanceSheet' ? 'BS' : def.statement === 'ProfitAndLoss' ? 'P&L' : 'General'}
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
