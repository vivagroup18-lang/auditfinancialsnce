import React from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Printer, ShieldCheck, Mail } from 'lucide-react';
import { ProfitAndLossData, EntityConfig } from '../types';
import { computeSection40bLimit } from '../utils/financialCalculations';

interface ProfitLossViewProps {
  profitAndLoss: ProfitAndLossData;
  config: EntityConfig;
  onSelectNote: (noteNumber: number) => void;
  onEmailStatement?: () => void;
}

export const ProfitLossView: React.FC<ProfitLossViewProps> = ({
  profitAndLoss,
  config,
  onSelectNote,
  onEmailStatement,
}) => {
  const formatINR = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // PY column: show "-" for zero values when no PY data has been uploaded
  const hasPYData = profitAndLoss.isPreviousYearUploaded;
  const formatPY = (val?: number) => {
    if (!hasPYData) return '-';
    if (val === undefined || val === null || val === 0 || isNaN(val)) return '-';
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const prev = profitAndLoss.previousYear;
  const isProfitable = profitAndLoss.profitAfterTax >= 0;
  const currentPeriod = config.reportingPeriod || 'March 31, 2025';
  const previousPeriod = config.previousReportingPeriod || 'March 31, 2024';

  return (
    <div className="space-y-6">
      {/* Formal Header Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs text-center">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
          <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>ICAI Guidance Note Compliant (Form 3CB/3CD Ready)</span>
          </span>
          <div className="flex items-center gap-2">
            {onEmailStatement && (
              <button
                onClick={onEmailStatement}
                className="text-xs text-slate-700 hover:text-slate-900 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold transition shadow-2xs"
                title="Email Profit &amp; Loss Statement to Client via Gmail"
              >
                <Mail className="w-3.5 h-3.5 text-red-500" />
                <span>Email via Gmail</span>
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="text-xs text-slate-700 hover:text-slate-900 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold transition shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-slate-950 uppercase tracking-tight">
          {config.entityName || 'NON-CORPORATE ENTITY'}
        </h2>
        <div className="text-xs text-slate-500 font-medium mt-1">
          {config.entityType} • Statutory Statement of Profit and Loss
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mt-2.5">
          STATEMENT OF PROFIT AND LOSS FOR THE PERIOD ENDED {currentPeriod.toUpperCase()}
        </h3>
        <p className="text-[11px] text-slate-400 italic mt-0.5">
          (Formulated strictly in compliance with the ICAI Guidance Note on Financial Statements of Non-Corporate Entities)
        </p>

        {/* Profit Status Badge */}
        <div className="mt-4 flex items-center justify-center">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
              isProfitable
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            {isProfitable ? (
              <>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>
                  Net Profit for the Year: {formatINR(profitAndLoss.profitAfterTax)} (Transferred to {config.transferProfitTo === 'reserves' ? 'Reserves & Surplus (Note 4)' : "Owners'/Partners' Capital (Note 3)"})
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span>
                  Net Loss for the Year: {formatINR(Math.abs(profitAndLoss.profitAfterTax))} (Deducted from {config.transferProfitTo === 'reserves' ? 'Reserves & Surplus (Note 4)' : "Owners'/Partners' Capital (Note 3)"})
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* P&L Statement Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Particulars</th>
              <th className="py-3 px-2 w-24 text-center">Note No.</th>
              <th className="py-3 px-4 w-44 text-right">Figures for Current Period ({currentPeriod})</th>
              <th className="py-3 px-4 w-44 text-right">
                <div>Figures for Previous Period ({previousPeriod})</div>
                {profitAndLoss.isPreviousYearUploaded && (
                  <div className="mt-0.5">
                    <span className="inline-block text-[9px] px-1.5 py-0.5 rounded font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 truncate max-w-[170px]" title={profitAndLoss.previousYearFileName}>
                      PY TB: {profitAndLoss.previousYearFileName || 'Audited'}
                    </span>
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
            {/* I. Revenue from Operations */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 px-6 text-slate-900 font-semibold">I. Revenue from Operations</td>
              <td className="py-2.5 px-2 text-center">
                <button
                  onClick={() => onSelectNote(19)}
                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 19: Revenue from Operations"
                >
                  19 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold">
                {formatINR(profitAndLoss.revenueFromOperations)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-semibold">
                {formatPY(prev.revenueFromOperations)}
              </td>
            </tr>

            {/* II. Other Income */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 px-6 text-slate-900 font-semibold">II. Other Income</td>
              <td className="py-2.5 px-2 text-center">
                <button
                  onClick={() => onSelectNote(20)}
                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 20: Other Income"
                >
                  20 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold">
                {formatINR(profitAndLoss.otherIncome)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-semibold">
                {formatPY(prev.otherIncome)}
              </td>
            </tr>

            {/* III. Total Income */}
            <tr className="bg-slate-100/70 font-bold text-slate-950">
              <td className="py-3 px-6 uppercase tracking-wide">III. TOTAL INCOME (I + II)</td>
              <td className="py-3 px-2 text-center"></td>
              <td className="py-3 px-4 text-right font-mono text-sm text-blue-900 font-bold border-t border-b border-slate-300">
                {formatINR(profitAndLoss.totalRevenue)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm text-blue-800/80 font-bold border-t border-b border-slate-300">
                {formatPY(prev.totalRevenue)}
              </td>
            </tr>

            {/* IV. Expenses Section Header */}
            <tr className="bg-slate-100/80 font-bold text-slate-950">
              <td colSpan={4} className="py-2.5 px-4 text-xs tracking-wide">
                IV. EXPENSES:
              </td>
            </tr>

            {/* (a) Cost of goods sold - Note 21 */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 px-8 text-slate-800 font-medium">
                Cost of goods sold
                <span className="block text-[11px] text-slate-500 font-normal pl-4">
                  (a) Cost of materials consumed: {formatINR(profitAndLoss.costOfRawMaterialsConsumed)}
                </span>
                <span className="block text-[11px] text-slate-500 font-normal pl-4">
                  (b) Purchases of Stock-in-Trade: {formatINR(profitAndLoss.purchasesOfStockInTrade || 0)}
                </span>
                <span className="block text-[11px] text-slate-500 font-normal pl-4">
                  (c) Changes in inventories of Finished Goods, WIP &amp; Stock: {formatINR(profitAndLoss.changesInInventories)}
                </span>
              </td>
              <td className="py-2.5 px-2 text-center align-top pt-3">
                <button
                  onClick={() => onSelectNote(21)}
                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 21: Cost of Goods Sold"
                >
                  21 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold align-top pt-3">
                {formatINR(profitAndLoss.costOfGoodsSold)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-semibold align-top pt-3">
                {formatPY(prev.costOfGoodsSold)}
              </td>
            </tr>

            {/* (b) Employee Benefits Expense - Note 22 */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 px-8 text-slate-800 font-medium">Employee benefits expense</td>
              <td className="py-2.5 px-2 text-center">
                <button
                  onClick={() => onSelectNote(22)}
                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 22: Employee Benefits Expense"
                >
                  22 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold">
                {formatINR(profitAndLoss.employeeBenefitsExpense)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-semibold">
                {formatPY(prev.employeeBenefitsExpense)}
              </td>
            </tr>

            {/* (c) Finance Costs - Note 23 */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 px-8 text-slate-800 font-medium">Finance costs</td>
              <td className="py-2.5 px-2 text-center">
                <button
                  onClick={() => onSelectNote(23)}
                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 23: Finance Costs"
                >
                  23 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold">
                {formatINR(profitAndLoss.financeCosts)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-semibold">
                {formatPY(prev.financeCosts)}
              </td>
            </tr>

            {/* (d) Depreciation and Amortization Expense - Note 24 */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 px-8 text-slate-800 font-medium">Depreciation and amortization expense</td>
              <td className="py-2.5 px-2 text-center">
                <button
                  onClick={() => onSelectNote(24)}
                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 24: Depreciation and Amortization Expense"
                >
                  24 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold">
                {formatINR(profitAndLoss.depreciationExpense)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-semibold">
                {formatPY(prev.depreciationExpense)}
              </td>
            </tr>

            {/* (e) Other Expenses - Note 25 */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 px-8 text-slate-800 font-medium">
                Other expenses
              </td>
              <td className="py-2.5 px-2 text-center">
                <button
                  onClick={() => onSelectNote(25)}
                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 25: Other Expenses"
                >
                  25 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold">
                {formatINR(profitAndLoss.otherExpenses)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-semibold">
                {formatPY(prev.otherExpenses)}
              </td>
            </tr>

            {/* Total Expenses Row */}
            <tr className="bg-slate-100/70 font-bold text-slate-950">
              <td className="py-3 px-6 uppercase tracking-wide">TOTAL EXPENSES</td>
              <td className="py-3 px-2 text-center"></td>
              <td className="py-3 px-4 text-right font-mono text-sm text-slate-950 font-bold border-t border-b border-slate-300">
                {formatINR(profitAndLoss.totalExpenses)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm text-slate-600 font-bold border-t border-b border-slate-300">
                {formatPY(prev.totalExpenses)}
              </td>
            </tr>

            {/* V. Profit/(loss) before exceptional and extraordinary items, partners' remuneration and tax (III- IV) */}
            <tr className="bg-slate-50/70 font-semibold text-slate-900">
              <td className="py-2.5 px-6">
                V. Profit/(loss) before exceptional and extraordinary items, partners' remuneration and tax (III- IV)
              </td>
              <td className="py-2.5 px-2 text-center">-</td>
              <td className="py-2.5 px-4 text-right font-mono font-semibold">
                {formatINR(profitAndLoss.profitBeforeExceptionalAndTax)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-semibold">
                {formatPY(prev.profitBeforeExceptionalAndTax)}
              </td>
            </tr>

            {/* VI. Exceptional items (specify nature & provide note/delete if none) */}
            <tr className="hover:bg-slate-50 transition-colors text-slate-700">
              <td className="py-2 px-8">VI. Exceptional items (specify nature &amp; provide note/delete if none)</td>
              <td className="py-2 px-2 text-center">-</td>
              <td className="py-2 px-4 text-right font-mono">
                {profitAndLoss.exceptionalItems ? formatINR(profitAndLoss.exceptionalItems) : '-'}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {prev.exceptionalItems ? formatPY(prev.exceptionalItems) : '-'}
              </td>
            </tr>

            {/* VII. Profit/(loss) before extraordinary items, partners' remuneration and tax (V-VI) */}
            <tr className="hover:bg-slate-50 transition-colors text-slate-700">
              <td className="py-2 px-8">
                VII. Profit/(loss) before extraordinary items, partners' remuneration and tax (V-VI)
              </td>
              <td className="py-2.5 px-2 text-center">-</td>
              <td className="py-2.5 px-4 text-right font-mono font-medium">
                {formatINR(profitAndLoss.profitBeforeExtraordinaryAndTax)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-medium">
                {formatPY(prev.profitBeforeExtraordinaryAndTax)}
              </td>
            </tr>

            {/* VIII. Extraordinary Items (specify nature & provide note/delete if none) */}
            <tr className="hover:bg-slate-50 transition-colors text-slate-700">
              <td className="py-2 px-8">VIII. Extraordinary Items (specify nature &amp; provide note/delete if none)</td>
              <td className="py-2 px-2 text-center">-</td>
              <td className="py-2 px-4 text-right font-mono">
                {profitAndLoss.extraordinaryItems ? formatINR(profitAndLoss.extraordinaryItems) : '-'}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {prev.extraordinaryItems ? formatPY(prev.extraordinaryItems) : '-'}
              </td>
            </tr>

            {/* IX. Profit before, partners' remuneration and tax (VII-VIII) */}
            <tr className="bg-amber-50/60 font-bold text-amber-950 border-t border-b border-amber-200">
              <td className="py-2.5 px-6">
                IX. Profit before, partners' remuneration and tax (VII-VIII)
              </td>
              <td className="py-2.5 px-2 text-center">-</td>
              <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-900">
                {formatINR(profitAndLoss.profitBeforePartnersRemunerationAndTax)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-600">
                {formatPY(prev.profitBeforePartnersRemunerationAndTax)}
              </td>
            </tr>

            {/* X. Partners’ remuneration* */}
            <tr className="bg-emerald-50/50 hover:bg-emerald-50 transition-colors font-semibold text-emerald-950">
              <td className="py-2.5 px-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>X. Partners’ remuneration*</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Sec 40(b) Statutory Line
                  </span>
                </div>
              </td>
              <td className="py-2.5 px-2 text-center">
                <button
                  type="button"
                  onClick={() => onSelectNote(22)}
                  className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 hover:bg-emerald-200 text-[10px] font-black transition border border-emerald-300 inline-flex items-center gap-1"
                  title="View Note 22: Partners' Remuneration & Employee Benefits"
                >
                  * <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-900">
                {profitAndLoss.partnersRemuneration > 0 ? formatINR(profitAndLoss.partnersRemuneration) : '-'}
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-semibold">
                {prev.partnersRemuneration > 0 ? formatPY(prev.partnersRemuneration) : '-'}
              </td>
            </tr>

            {/* XI. Profit before tax (IX- X) */}
            <tr className="bg-slate-100 font-black text-slate-950 border-t-2 border-b-2 border-slate-300">
              <td className="py-3 px-6 text-sm">XI. PROFIT BEFORE TAX (IX - X)</td>
              <td className="py-3 px-2 text-center">-</td>
              <td className="py-3 px-4 text-right font-mono text-sm font-black text-slate-950">
                {formatINR(profitAndLoss.profitBeforeTax)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm font-bold text-slate-600">
                {formatPY(prev.profitBeforeTax)}
              </td>
            </tr>

            {/* XII. Tax Expense */}
            <tr className="font-semibold text-slate-900 bg-slate-50/40">
              <td className="py-2 px-6" colSpan={4}>XII. Tax expense:</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">
                Current tax
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(8)}
                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 8: Short-Term Provisions for Taxation"
                >
                  8 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(profitAndLoss.currentTax)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.currentTax)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">Excess/ Short provision of tax relating to earlier years</td>
              <td className="py-2 px-2 text-center">-</td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {profitAndLoss.excessShortTaxEarlierYears ? formatINR(profitAndLoss.excessShortTaxEarlierYears) : '-'}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {prev.excessShortTaxEarlierYears ? formatPY(prev.excessShortTaxEarlierYears) : '-'}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">Deferred tax charge/ (benefit)</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(6)}
                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 6: Deferred Tax"
                >
                  6 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(profitAndLoss.deferredTax)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.deferredTax)}
              </td>
            </tr>

            {/* XIII. Profit/(Loss) for the period from continuing operations (XI-XII) */}
            <tr className="hover:bg-slate-50 transition-colors font-medium text-slate-800">
              <td className="py-2 px-6">
                XIII. Profit/(Loss) for the period from continuing operations (XI-XII)
              </td>
              <td className="py-2 px-2 text-center">-</td>
              <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                {formatINR(profitAndLoss.profitFromContinuingOps)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500 font-bold">
                {formatPY(prev.profitAfterTax)}
              </td>
            </tr>

            {/* XIV. Profit/(loss) from discontinuing operations */}
            <tr className="hover:bg-slate-50 transition-colors text-slate-700">
              <td className="py-2 px-6">XIV. Profit/(loss) from discontinuing operations</td>
              <td className="py-2 px-2 text-center">-</td>
              <td className="py-2 px-4 text-right font-mono">
                {profitAndLoss.profitFromDiscontinuingOps ? formatINR(profitAndLoss.profitFromDiscontinuingOps) : '-'}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">-</td>
            </tr>

            {/* XV. Tax expense of discontinuing operations */}
            <tr className="hover:bg-slate-50 transition-colors text-slate-700">
              <td className="py-2 px-6">XV. Tax expense of discontinuing operations</td>
              <td className="py-2 px-2 text-center">-</td>
              <td className="py-2 px-4 text-right font-mono">
                {profitAndLoss.taxExpenseDiscontinuingOps ? formatINR(profitAndLoss.taxExpenseDiscontinuingOps) : '-'}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">-</td>
            </tr>

            {/* XVI. Profit/(loss) from discontinuing operations (after tax) (XIV-XV) */}
            <tr className="hover:bg-slate-50 transition-colors text-slate-700">
              <td className="py-2 px-6">XVI. Profit/(loss) from discontinuing operations (after tax) (XIV-XV)</td>
              <td className="py-2 px-2 text-center">-</td>
              <td className="py-2 px-4 text-right font-mono">
                {profitAndLoss.profitFromDiscontinuingOpsAfterTax ? formatINR(profitAndLoss.profitFromDiscontinuingOpsAfterTax) : '-'}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">-</td>
            </tr>

            {/* XVII. Profit/(Loss) for the year (XIII+XVI) */}
            <tr className="bg-slate-900 text-white font-bold text-xs">
              <td className="py-3 px-6 uppercase tracking-wide text-sm">
                XVII. PROFIT / (LOSS) FOR THE YEAR (XIII + XVI)
              </td>
              <td className="py-3 px-2 text-center">-</td>
              <td className="py-3 px-4 text-right font-mono text-base text-emerald-300 font-bold">
                {formatINR(profitAndLoss.profitAfterTax)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-base text-emerald-400/80 font-bold">
                {formatPY(prev.profitAfterTax)}
              </td>
            </tr>

            {/* ICAI Guidance Note Statutory Disclosures & Footnotes */}
            <tr className="bg-slate-50/70 text-slate-500 text-[11px] italic">
              <td colSpan={4} className="py-2 px-6">
                * wherever applicable
              </td>
            </tr>
            <tr className="bg-slate-50 text-slate-700 font-semibold text-xs border-t border-slate-200">
              <td colSpan={4} className="py-2.5 px-6">
                The accompanying notes are an integral part of the financial statements
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Partners' Remuneration Statutory Disclosure & Section 40(b) Analysis Card */}
      <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <h3 className="font-bold text-emerald-950 text-sm">
              * Statutory Disclosure: Partners' Remuneration (Line X) &amp; Section 40(b) Analysis
            </h3>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 border border-emerald-300">
            Income Tax Act, 1961 • Sec 40(b) Compliance
          </span>
        </div>

        <p className="text-xs text-emerald-900 leading-relaxed">
          Under the ICAI Guidance Note for Non-Corporate Entities (Partnerships, LLPs, HUFs), remuneration to working partners is shown as a distinct deduction on the face of the Statement of Profit and Loss (Line X) rather than lumped into Other Expenses or Employee Benefits.
        </p>

        {/* Ledgers Breakdown */}
        {profitAndLoss.partnersRemunerationItems && profitAndLoss.partnersRemunerationItems.length > 0 ? (
          <div className="bg-white/90 rounded-xl border border-emerald-200 overflow-hidden text-xs">
            <div className="px-3.5 py-2 bg-emerald-100/60 font-bold text-emerald-950 flex items-center justify-between">
              <span>Classified Partners' Remuneration Ledger Accounts:</span>
              <span className="font-mono font-black text-emerald-900">
                Total: {formatINR(profitAndLoss.partnersRemuneration)}
              </span>
            </div>
            <div className="divide-y divide-emerald-100">
              {profitAndLoss.partnersRemunerationItems.map((item, idx) => (
                <div key={item.id || idx} className="px-3.5 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="font-medium text-slate-900">{item.accountName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      (Assigned to Note {item.noteNumber}: {item.subCategory})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-950">
                    {formatINR(Math.abs(item.displayBalance !== undefined ? item.displayBalance : item.netBalance))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <div>
              <span className="font-bold">No Partners' Remuneration Ledger Mapped Yet:</span>
              <span className="ml-1 text-amber-800">
                If your trial balance contains partners' remuneration or salary accounts, ensure they are classified with subcategory "Partners' remuneration" or Note 22 so they appear on Line X.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectNote(22)}
              className="px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold transition text-[11px] shrink-0 ml-3"
            >
              Review Mapping
            </button>
          </div>
        )}

        {/* Section 40(b) Maximum Allowable Deduction Calculator (Budget 2024 Revised Limits) */}
        {profitAndLoss.profitBeforePartnersRemunerationAndTax !== undefined && (
          <div className="space-y-2.5 pt-1 text-xs">
            {(() => {
              const sec40b = computeSection40bLimit(
                profitAndLoss.profitBeforePartnersRemunerationAndTax || 0,
                profitAndLoss.partnersRemuneration || 0,
                true // Budget 2024 enhanced limits
              );

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Book Profit (Line IX)</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatINR(sec40b.bookProfit)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Sec 40(b) Allowable Cap</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded font-mono">
                          Budget 2024
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-800 text-sm">
                        {formatINR(sec40b.maxAllowableRemuneration)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Actual Remuneration (Line X)</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatINR(sec40b.actualRemuneration)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Compliance Status</span>
                      <span className={`font-bold text-xs ${sec40b.actualRemuneration === 0 ? 'text-slate-600' : (sec40b.isWithinLimit ? 'text-emerald-700' : 'text-rose-700')}`}>
                        {sec40b.actualRemuneration === 0
                          ? 'No remuneration charged'
                          : sec40b.isWithinLimit
                          ? '✓ Fully allowable under Sec 40(b)'
                          : `⚠ Exceeds limit by ${formatINR(sec40b.excessDisallowed)}`}
                      </span>
                    </div>
                  </div>

                  {/* Statutory Computation Breakdown as per Budget 2024 */}
                  <div className="p-3 bg-emerald-100/40 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>Sec 40(b) Allowable Slabs (As amended by Finance (No. 2) Act, 2024):</span>
                      </div>
                      <div className="text-emerald-900 font-mono text-[10px]">
                        • First ₹6,00,000 of book profit (or in case of loss): Higher of ₹3,00,000 or 90% = {formatINR(sec40b.firstSlabAllowable)}
                        {sec40b.balanceBookProfit > 0 && (
                          <span> • Balance ₹{formatINR(sec40b.balanceBookProfit)} @ 60% = {formatINR(sec40b.balanceSlabAllowable)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-600 block">Max Permissible Deduction:</span>
                      <span className="font-mono font-black text-emerald-950 text-xs">
                        {formatINR(sec40b.maxAllowableRemuneration)}
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Footnote */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 flex items-start gap-3">
        <span className="font-bold text-slate-800 shrink-0">Notes 1 to 25:</span>
        <p className="leading-relaxed">
          The accompanying Notes 1 through 25 are an integral part of this Statement of Profit and Loss. Note 1 describes the Corporate/Entity Information and Note 2 details Significant Accounting Policies (Revenue Recognition AS-9, Inventory Valuation AS-2, Depreciation AS-10, Tax on Income AS-22).
        </p>
      </div>
    </div>
  );
};


