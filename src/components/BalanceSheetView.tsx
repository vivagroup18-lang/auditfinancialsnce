import React from 'react';
import { CheckCircle2, AlertTriangle, ExternalLink, Printer, ShieldCheck, Mail, Users } from 'lucide-react';
import { BalanceSheetData, EntityConfig } from '../types';

interface BalanceSheetViewProps {
  balanceSheet: BalanceSheetData;
  config: EntityConfig;
  onSelectNote: (noteNumber: number) => void;
  onEmailStatement?: () => void;
}

export const BalanceSheetView: React.FC<BalanceSheetViewProps> = ({
  balanceSheet,
  config,
  onSelectNote,
  onEmailStatement,
}) => {
  const formatINR = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // PY column: show "-" for zero values when no PY data has been uploaded
  const hasPYData = balanceSheet.isPreviousYearUploaded;
  const formatPY = (val?: number) => {
    if (!hasPYData) return '-';
    if (val === undefined || val === null || val === 0 || isNaN(val)) return '-';
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const prev = balanceSheet.previousYear;
  const currentPeriod = config.reportingPeriod || 'March 31, 2025';
  const previousPeriod = config.previousReportingPeriod || 'March 31, 2024';

  return (
    <div className="space-y-6">
      {/* Formal Header Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs text-center">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>ICAI Guidance Note Compliant (Form 3CB/3CD Ready)</span>
          </span>
          <div className="flex items-center gap-2">
            {onEmailStatement && (
              <button
                onClick={onEmailStatement}
                className="text-xs text-slate-700 hover:text-slate-900 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold transition shadow-2xs"
                title="Email Balance Sheet to Client via Gmail"
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
          {config.entityType} • Statutory Balance Sheet
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mt-2.5">
          BALANCE SHEET AS AT {currentPeriod.toUpperCase()}
        </h3>
        <p className="text-[11px] text-slate-400 italic mt-0.5">
          (Formulated strictly in compliance with the ICAI Guidance Note on Financial Statements of Non-Corporate Entities)
        </p>

        {/* Tally Equation Alert */}
        <div className="mt-4 flex items-center justify-center">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
              balanceSheet.isBalanced
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            {balanceSheet.isBalanced ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Balance Sheet Equation Tallied: Equity &amp; Liabilities = Assets</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>
                  Equation Variance: Out of Balance by {Math.abs(balanceSheet.difference).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Structured ICAI Financial Statement Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Particulars</th>
              <th className="py-3 px-2 w-24 text-center">Note No.</th>
              <th className="py-3 px-4 w-44 text-right">Figures as at end of Current Period ({currentPeriod})</th>
              <th className="py-3 px-4 w-44 text-right">
                <div>Figures as at end of Previous Period ({previousPeriod})</div>
                {balanceSheet.isPreviousYearUploaded && (
                  <div className="mt-0.5">
                    <span className="inline-block text-[9px] px-1.5 py-0.5 rounded font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 truncate max-w-[170px]" title={balanceSheet.previousYearFileName}>
                      PY TB: {balanceSheet.previousYearFileName || 'Audited'}
                    </span>
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
            {/* I. EQUITY AND LIABILITIES */}
            <tr className="bg-slate-100/80 font-bold text-slate-950">
              <td colSpan={4} className="py-2.5 px-4 text-xs tracking-wide">
                I. EQUITY AND LIABILITIES
              </td>
            </tr>

            {/* (1) Owners' Funds */}
            <tr className="font-semibold text-slate-900 bg-slate-50/40">
              <td className="py-2 px-6" colSpan={4}>(1) Owners' Funds</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    {config.entityType === 'Partnership Firm' || config.entityType === 'LLP'
                      ? "(a) Partners' Capital Accounts"
                      : "(a) Owners' Capital Account"}
                  </span>
                  {config.partners && config.partners.length > 0 && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                      <Users className="w-2.5 h-2.5 text-emerald-600" />
                      <span>{config.partners.length} {config.partners.length === 1 ? 'Partner' : 'Partners'}</span>
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(3)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 3: Owners' Capital Account"
                >
                  3 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.ownersCapital)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.ownersCapital)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">(b) Reserves and surplus</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(4)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 4: Reserves and Surplus"
                >
                  4 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.reservesAndSurplus)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.reservesAndSurplus)}
              </td>
            </tr>
            <tr className="bg-slate-50 font-semibold text-slate-900">
              <td className="py-2 px-8 text-slate-900">Sub-total: Owners' Funds</td>
              <td className="py-2 px-2 text-center"></td>
              <td className="py-2 px-4 text-right font-mono text-slate-950 font-bold border-t border-slate-300">
                {formatINR(balanceSheet.totalOwnersFunds)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-600 font-bold border-t border-slate-300">
                {formatPY(prev.totalOwnersFunds)}
              </td>
            </tr>

            {/* (2) Non-current liabilities */}
            <tr className="font-semibold text-slate-900 bg-slate-50/40">
              <td className="py-2 px-6" colSpan={4}>(2) Non-current liabilities</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">(a) Long-term borrowings</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(5)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 5: Borrowings"
                >
                  5 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.longTermBorrowings)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.longTermBorrowings)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">
                (b) Deferred tax liabilities (Net)
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(6)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 6: Deferred Tax"
                >
                  6 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.deferredTaxLiabilities)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.deferredTaxLiabilities)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">(c) Other Long term liabilities</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(7)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 7: Other Long-Term Liabilities"
                >
                  7 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.otherLongTermLiabilities || 0)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.otherLongTermLiabilities || 0)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">(d) Long-term provisions</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(8)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 8: Provisions"
                >
                  8 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.longTermProvisions)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.longTermProvisions)}
              </td>
            </tr>
            <tr className="bg-slate-50 font-semibold text-slate-900">
              <td className="py-2 px-8 text-slate-900">Sub-total: Non-current liabilities</td>
              <td className="py-2 px-2 text-center"></td>
              <td className="py-2 px-4 text-right font-mono text-slate-950 font-bold border-t border-slate-300">
                {formatINR(balanceSheet.totalNonCurrentLiabilities)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-600 font-bold border-t border-slate-300">
                {formatPY(prev.totalNonCurrentLiabilities)}
              </td>
            </tr>

            {/* (3) Current liabilities */}
            <tr className="font-semibold text-slate-900 bg-slate-50/40">
              <td className="py-2 px-6" colSpan={4}>(3) Current liabilities</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">(a) Short-term borrowings (CC/OD/Demand loans)</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(5)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 5: Borrowings (Short-Term Portion)"
                >
                  5 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.shortTermBorrowings)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.shortTermBorrowings)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">
                (b) Trade payables
                <span className="block text-[11px] text-slate-500 font-normal pl-4">
                  (A) total outstanding dues of micro and small enterprises (MSME): {formatINR(balanceSheet.tradePayablesMsme || 0)}
                </span>
                <span className="block text-[11px] text-slate-500 font-normal pl-4">
                  (B) total outstanding dues of creditors other than micro and small enterprises: {formatINR(balanceSheet.tradePayablesOther || balanceSheet.tradePayables)}
                </span>
              </td>
              <td className="py-2 px-2 text-center align-top pt-3">
                <button
                  onClick={() => onSelectNote(9)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 9: Trade Payables"
                >
                  9 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900 align-top pt-3">
                {formatINR(balanceSheet.tradePayables)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500 align-top pt-3">
                {formatPY(prev.tradePayables)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">
                (c) Other current liabilities
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(10)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 10: Other Current Liabilities"
                >
                  10 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.otherCurrentLiabilities)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.otherCurrentLiabilities)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">
                (d) Short-term provisions
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(8)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 8: Provisions (Short-Term Portion)"
                >
                  8 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.shortTermProvisions || 0)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.shortTermProvisions || 0)}
              </td>
            </tr>
            <tr className="bg-slate-50 font-semibold text-slate-900">
              <td className="py-2 px-8 text-slate-900">Sub-total: Current liabilities</td>
              <td className="py-2 px-2 text-center"></td>
              <td className="py-2 px-4 text-right font-mono text-slate-950 font-bold border-t border-slate-300">
                {formatINR(balanceSheet.totalCurrentLiabilities)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-600 font-bold border-t border-slate-300">
                {formatPY(prev.totalCurrentLiabilities)}
              </td>
            </tr>

            {/* Total Equity & Liabilities */}
            <tr className="bg-slate-900 text-white font-bold text-xs">
              <td className="py-3 px-6 uppercase tracking-wide">TOTAL EQUITY AND LIABILITIES</td>
              <td className="py-3 px-2 text-center"></td>
              <td className="py-3 px-4 text-right font-mono text-sm text-emerald-300">
                {formatINR(balanceSheet.totalEquityAndLiabilities)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm text-emerald-400/80">
                {formatPY(prev.totalEquityAndLiabilities)}
              </td>
            </tr>

            {/* II. ASSETS */}
            <tr className="bg-slate-100/80 font-bold text-slate-950">
              <td colSpan={4} className="py-2.5 px-4 text-xs tracking-wide">
                II. ASSETS
              </td>
            </tr>

            {/* (1) Non-current assets */}
            <tr className="font-semibold text-slate-900 bg-slate-50/40">
              <td className="py-2 px-6" colSpan={4}>(1) Non-current assets</td>
            </tr>
            {/* Property, Plant and Equipment and Intangible assets */}
            <tr className="font-semibold text-slate-900 bg-slate-50/20">
              <td className="py-2 px-10 text-slate-800" colSpan={4}>
                Property, Plant and Equipment and Intangible assets
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-14 text-slate-700">Property, Plant and Equipment</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(11)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 11: Property, Plant and Equipment"
                >
                  11 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.propertyPlantEquipment)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.propertyPlantEquipment)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-14 text-slate-700">Intangible assets</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(11)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 11: Intangible Assets"
                >
                  11 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.intangibleAssets || 0)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.intangibleAssets || 0)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-14 text-slate-700">Capital work in progress</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(11)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 11: Capital Work in Progress"
                >
                  11 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.capitalWorkInProgress || 0)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.capitalWorkInProgress || 0)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-14 text-slate-700">Intangible asset under development</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(11)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 11: Intangible Assets under Development"
                >
                  11 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.intangibleAssetUnderDevelopment || 0)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.intangibleAssetUnderDevelopment || 0)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">(b) Non-current investments</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(12)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 12: Investments (Non-Current Portion)"
                >
                  12 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.nonCurrentInvestments)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.nonCurrentInvestments)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">
                (c) Deferred tax assets (Net)
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(6)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 6: Deferred Tax Assets"
                >
                  6 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.deferredTaxAssets || 0)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.deferredTaxAssets || 0)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">(d) Long-term loans and advances</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(13)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 13: Loans and Advances (Long-Term)"
                >
                  13 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.longTermLoansAndAdvances || 0)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.longTermLoansAndAdvances || 0)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">(e) Other non-current assets</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(14)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 14: Other Non-Current Assets"
                >
                  14 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.otherNonCurrentAssets)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.otherNonCurrentAssets)}
              </td>
            </tr>
            <tr className="bg-slate-50 font-semibold text-slate-900">
              <td className="py-2 px-8 text-slate-900">Sub-total: Non-current assets</td>
              <td className="py-2 px-2 text-center"></td>
              <td className="py-2 px-4 text-right font-mono text-slate-950 font-bold border-t border-slate-300">
                {formatINR(balanceSheet.totalNonCurrentAssets)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-600 font-bold border-t border-slate-300">
                {formatPY(prev.totalNonCurrentAssets)}
              </td>
            </tr>

            {/* (2) Current assets */}
            <tr className="font-semibold text-slate-900 bg-slate-50/40">
              <td className="py-2 px-6" colSpan={4}>(2) Current assets</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">(a) Current investments</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(12)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 12: Investments (Current Portion)"
                >
                  12 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.currentInvestments)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.currentInvestments)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">(b) Inventories</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(15)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 15: Inventories"
                >
                  15 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.inventories)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.inventories)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">(c) Trade receivables</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(16)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 16: Trade Receivables"
                >
                  16 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.tradeReceivables)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.tradeReceivables)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">(d) Cash and bank balances</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(17)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 17: Cash and Bank Balances"
                >
                  17 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.cashAndBankBalances)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.cashAndBankBalances)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">
                (e) Short-term loans and advances
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(13)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 13: Loans and Advances (Short-Term Portion)"
                >
                  13 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.shortTermLoansAndAdvances)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.shortTermLoansAndAdvances)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-2 px-10 text-slate-700">
                (f) Other current assets
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onSelectNote(18)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 18: Other Current Assets"
                >
                  18 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-900">
                {formatINR(balanceSheet.otherCurrentAssets || 0)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-500">
                {formatPY(prev.otherCurrentAssets || 0)}
              </td>
            </tr>
            <tr className="bg-slate-50 font-semibold text-slate-900">
              <td className="py-2 px-8 text-slate-900">Sub-total: Current assets</td>
              <td className="py-2 px-2 text-center"></td>
              <td className="py-2 px-4 text-right font-mono text-slate-950 font-bold border-t border-slate-300">
                {formatINR(balanceSheet.totalCurrentAssets)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-slate-600 font-bold border-t border-slate-300">
                {formatPY(prev.totalCurrentAssets)}
              </td>
            </tr>

            {/* Total Assets */}
            <tr className="bg-slate-900 text-white font-bold text-xs">
              <td className="py-3 px-6 uppercase tracking-wide">TOTAL ASSETS</td>
              <td className="py-3 px-2 text-center"></td>
              <td className="py-3 px-4 text-right font-mono text-sm text-emerald-300">
                {formatINR(balanceSheet.totalAssets)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm text-emerald-400/80">
                {formatPY(prev.totalAssets)}
              </td>
            </tr>

            {/* Statutory References as per ICAI Page 3 */}
            <tr className="bg-slate-50/80 text-slate-700 font-semibold text-xs border-t border-slate-200">
              <td className="py-2.5 px-6">Brief about the Entity</td>
              <td className="py-2.5 px-2 text-center">
                <button
                  onClick={() => onSelectNote(1)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 1: Brief about the Entity"
                >
                  1 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
            </tr>
            <tr className="bg-slate-50/80 text-slate-700 font-semibold text-xs">
              <td className="py-2.5 px-6">Summary of significant accounting policies</td>
              <td className="py-2.5 px-2 text-center">
                <button
                  onClick={() => onSelectNote(2)}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition inline-flex items-center gap-1"
                  title="View Note 2: Significant Accounting Policies"
                >
                  2 <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
            </tr>
            <tr className="bg-slate-50 text-slate-700 font-semibold text-xs border-t border-slate-200">
              <td colSpan={4} className="py-2.5 px-6">
                The accompanying notes are an integral part of the financial statements
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Accounting Footnotes & Policies Reminder */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 flex items-start gap-3">
        <span className="font-bold text-slate-800 shrink-0">Notes 1 to 25:</span>
        <p className="leading-relaxed">
          The accompanying Notes 1 through 25 are an integral part of these Non-Corporate Entity financial statements.
          Schedule references strictly map to the ICAI Guidance Note on Non-Corporate Entities taxonomy. Signed in terms of our statutory audit report of even date attached for Form 3CB/3CD.
        </p>
      </div>
    </div>
  );
};


