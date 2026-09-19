import React from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Printer, ShieldCheck, Mail } from 'lucide-react';
import { ProfitAndLossData, EntityConfig } from '../types';

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

            {/* III. Total Revenue */}
            <tr className="bg-slate-100/70 font-bold text-slate-950">
              <td className="py-3 px-6 uppercase tracking-wide">III. TOTAL REVENUE (I + II)</td>
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
                IV. EXPENSES
              </td>
            </tr>

            {/* (a) Cost of Goods Sold - Note 21 */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 px-8 text-slate-800 font-medium">
                (a) Cost of goods sold
              </td>
              <td className="py-2.5 px-2 text-center">
                <button
                  onClick={() => onSelectNote(21)}
                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 21: Cost of Goods Sold"
                >
                  21 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold">
                {formatINR(profitAndLoss.costOfGoodsSold)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-semibold">
                {formatPY(prev.costOfGoodsSold)}
              </td>
            </tr>

            {/* (b) Employee Benefits Expense - Note 22 */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 px-8 text-slate-800 font-medium">(b) Employee benefits expense</td>
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
              <td className="py-2.5 px-8 text-slate-800 font-medium">(c) Finance costs</td>
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
              <td className="py-2.5 px-8 text-slate-800 font-medium">(d) Depreciation and amortization expense</td>
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
                (e) Other expenses
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

            {/* V. Profit Before Tax */}
            <tr className="bg-slate-50/90 font-bold text-slate-900">
              <td className="py-3 px-6 text-sm">V. PROFIT / (LOSS) BEFORE TAX (III - IV)</td>
              <td className="py-3 px-2 text-center"></td>
              <td className="py-3 px-4 text-right font-mono text-sm font-bold">
                {formatINR(profitAndLoss.profitBeforeTax)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm font-bold text-slate-600">
                {formatPY(prev.profitBeforeTax)}
              </td>
            </tr>

            {/* VI. Tax Expense */}
            <tr className="font-semibold text-slate-900 bg-slate-50/40">
              <td className="py-2 px-6" colSpan={4}>VI. Tax expense:</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">
                (1) Current tax ({config.taxRatePercent || 30}% Income Tax provision)
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
              <td className="py-2 px-10 text-slate-700">(2) Deferred tax</td>
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

            {/* VII. Profit After Tax */}
            <tr className="bg-slate-900 text-white font-bold text-xs">
              <td className="py-3 px-6 uppercase tracking-wide text-sm">
                VII. PROFIT / (LOSS) FOR THE PERIOD (V - VI)
              </td>
              <td className="py-3 px-2 text-center"></td>
              <td className="py-3 px-4 text-right font-mono text-base text-emerald-300 font-bold">
                {formatINR(profitAndLoss.profitAfterTax)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-base text-emerald-400/80 font-bold">
                {formatPY(prev.profitAfterTax)}
              </td>
            </tr>
          </tbody>
        </table>
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


