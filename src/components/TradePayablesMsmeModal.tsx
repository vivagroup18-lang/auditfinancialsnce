import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Calculator,
  RefreshCw,
  Sliders,
  ShieldCheck,
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { EntityConfig, TradePayablesMsmeConfig, NoteScheduleData } from '../types';
import { formatINR } from '../utils/financialCalculations';

interface TradePayablesMsmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EntityConfig;
  onUpdateConfig: (updated: Partial<EntityConfig>) => void;
  noteSchedule?: NoteScheduleData;
}

export const TradePayablesMsmeModal: React.FC<TradePayablesMsmeModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  noteSchedule,
}) => {
  const [activeTab, setActiveTab] = useState<'sub_classification' | 'section_22' | 'aging_schedule'>('sub_classification');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Totals fetched from Trial Balance Note 9
  const totalCY = noteSchedule?.totalAmount || 0;
  const totalPY = noteSchedule?.previousYearAmount || 0;

  // Local state form for Trade Payables Config
  const [form, setForm] = useState<TradePayablesMsmeConfig>({
    msmeAmountCY: 0,
    msmeAmountPY: 0,
    othersAmountCY: totalCY,
    othersAmountPY: totalPY,

    msmeSec22PrincipalCY: 0,
    msmeSec22PrincipalPY: 0,
    msmeSec22InterestCY: 0,
    msmeSec22InterestPY: 0,

    msmeSec22DelayedPaymentsCY: 0,
    msmeSec22DelayedPaymentsPY: 0,
    msmeSec22InterestPaidCY: 0,
    msmeSec22InterestPaidPY: 0,

    msmeSec22InterestDueDelayCY: 0,
    msmeSec22InterestDueDelayPY: 0,

    msmeSec22InterestAccruedCY: 0,
    msmeSec22InterestAccruedPY: 0,

    msmeSec22FurtherInterestCY: 0,
    msmeSec22FurtherInterestPY: 0,

    agingMsmeLess1Yr: 0,
    agingMsme1To2Yrs: 0,
    agingMsme2To3Yrs: 0,
    agingMsmeMore3Yrs: 0,

    agingOthersLess1Yr: totalCY,
    agingOthers1To2Yrs: 0,
    agingOthers2To3Yrs: 0,
    agingOthersMore3Yrs: 0,

    agingDisputedMsmeLess1Yr: 0,
    agingDisputedMsme1To2Yrs: 0,
    agingDisputedMsme2To3Yrs: 0,
    agingDisputedMsmeMore3Yrs: 0,

    agingDisputedOthersLess1Yr: 0,
    agingDisputedOthers1To2Yrs: 0,
    agingDisputedOthers2To3Yrs: 0,
    agingDisputedOthersMore3Yrs: 0,
  });

  // Initialize on open
  useEffect(() => {
    if (!isOpen) return;

    // Detect ledger MSME breakdown if no prior config exists
    const msmeCreditors = noteSchedule?.items.filter((it) => {
      const sub = (it.subCategory || '').toLowerCase();
      const name = (it.accountName || '').toLowerCase();
      const isOther = sub.includes('other than micro') || name.includes('other than micro') || name.includes('other creditors');
      return !isOther && (sub.includes('msme') || name.includes('msme') || sub.includes('micro') || name.includes('micro') || sub.includes('(a)'));
    }) || [];

    const defaultMsmeCY = msmeCreditors.reduce((acc, it) => acc + (it.displayBalance !== undefined ? it.displayBalance : it.netBalance), 0);
    const defaultMsmePY = msmeCreditors.reduce((acc, it) => acc + (it.previousYearBalance || 0), 0);
    const defaultOthersCY = Math.max(0, totalCY - defaultMsmeCY);
    const defaultOthersPY = Math.max(0, totalPY - defaultMsmePY);

    const saved = config.tradePayablesConfig;
    if (saved) {
      setForm({
        msmeAmountCY: saved.msmeAmountCY ?? defaultMsmeCY,
        msmeAmountPY: saved.msmeAmountPY ?? defaultMsmePY,
        othersAmountCY: saved.othersAmountCY ?? defaultOthersCY,
        othersAmountPY: saved.othersAmountPY ?? defaultOthersPY,

        msmeSec22PrincipalCY: saved.msmeSec22PrincipalCY ?? saved.msmeAmountCY ?? defaultMsmeCY,
        msmeSec22PrincipalPY: saved.msmeSec22PrincipalPY ?? saved.msmeAmountPY ?? defaultMsmePY,
        msmeSec22InterestCY: saved.msmeSec22InterestCY ?? 0,
        msmeSec22InterestPY: saved.msmeSec22InterestPY ?? 0,

        msmeSec22DelayedPaymentsCY: saved.msmeSec22DelayedPaymentsCY ?? 0,
        msmeSec22DelayedPaymentsPY: saved.msmeSec22DelayedPaymentsPY ?? 0,
        msmeSec22InterestPaidCY: saved.msmeSec22InterestPaidCY ?? 0,
        msmeSec22InterestPaidPY: saved.msmeSec22InterestPaidPY ?? 0,

        msmeSec22InterestDueDelayCY: saved.msmeSec22InterestDueDelayCY ?? 0,
        msmeSec22InterestDueDelayPY: saved.msmeSec22InterestDueDelayPY ?? 0,

        msmeSec22InterestAccruedCY: saved.msmeSec22InterestAccruedCY ?? 0,
        msmeSec22InterestAccruedPY: saved.msmeSec22InterestAccruedPY ?? 0,

        msmeSec22FurtherInterestCY: saved.msmeSec22FurtherInterestCY ?? 0,
        msmeSec22FurtherInterestPY: saved.msmeSec22FurtherInterestPY ?? 0,

        agingMsmeLess1Yr: saved.agingMsmeLess1Yr ?? defaultMsmeCY,
        agingMsme1To2Yrs: saved.agingMsme1To2Yrs ?? 0,
        agingMsme2To3Yrs: saved.agingMsme2To3Yrs ?? 0,
        agingMsmeMore3Yrs: saved.agingMsmeMore3Yrs ?? 0,

        agingOthersLess1Yr: saved.agingOthersLess1Yr ?? defaultOthersCY,
        agingOthers1To2Yrs: saved.agingOthers1To2Yrs ?? 0,
        agingOthers2To3Yrs: saved.agingOthers2To3Yrs ?? 0,
        agingOthersMore3Yrs: saved.agingOthersMore3Yrs ?? 0,

        agingDisputedMsmeLess1Yr: saved.agingDisputedMsmeLess1Yr ?? 0,
        agingDisputedMsme1To2Yrs: saved.agingDisputedMsme1To2Yrs ?? 0,
        agingDisputedMsme2To3Yrs: saved.agingDisputedMsme2To3Yrs ?? 0,
        agingDisputedMsmeMore3Yrs: saved.agingDisputedMsmeMore3Yrs ?? 0,

        agingDisputedOthersLess1Yr: saved.agingDisputedOthersLess1Yr ?? 0,
        agingDisputedOthers1To2Yrs: saved.agingDisputedOthers1To2Yrs ?? 0,
        agingDisputedOthers2To3Yrs: saved.agingDisputedOthers2To3Yrs ?? 0,
        agingDisputedOthersMore3Yrs: saved.agingDisputedOthersMore3Yrs ?? 0,
      });
    } else {
      setForm({
        msmeAmountCY: defaultMsmeCY,
        msmeAmountPY: defaultMsmePY,
        othersAmountCY: defaultOthersCY,
        othersAmountPY: defaultOthersPY,

        msmeSec22PrincipalCY: defaultMsmeCY,
        msmeSec22PrincipalPY: defaultMsmePY,
        msmeSec22InterestCY: 0,
        msmeSec22InterestPY: 0,

        msmeSec22DelayedPaymentsCY: 0,
        msmeSec22DelayedPaymentsPY: 0,
        msmeSec22InterestPaidCY: 0,
        msmeSec22InterestPaidPY: 0,

        msmeSec22InterestDueDelayCY: 0,
        msmeSec22InterestDueDelayPY: 0,

        msmeSec22InterestAccruedCY: 0,
        msmeSec22InterestAccruedPY: 0,

        msmeSec22FurtherInterestCY: 0,
        msmeSec22FurtherInterestPY: 0,

        agingMsmeLess1Yr: defaultMsmeCY,
        agingMsme1To2Yrs: 0,
        agingMsme2To3Yrs: 0,
        agingMsmeMore3Yrs: 0,

        agingOthersLess1Yr: defaultOthersCY,
        agingOthers1To2Yrs: 0,
        agingOthers2To3Yrs: 0,
        agingOthersMore3Yrs: 0,

        agingDisputedMsmeLess1Yr: 0,
        agingDisputedMsme1To2Yrs: 0,
        agingDisputedMsme2To3Yrs: 0,
        agingDisputedMsmeMore3Yrs: 0,

        agingDisputedOthersLess1Yr: 0,
        agingDisputedOthers1To2Yrs: 0,
        agingDisputedOthers2To3Yrs: 0,
        agingDisputedOthersMore3Yrs: 0,
      });
    }
  }, [isOpen, config.tradePayablesConfig, totalCY, totalPY, noteSchedule]);

  // Calculations & Reconciliations
  const classifiedSumCY = (form.msmeAmountCY || 0) + (form.othersAmountCY || 0);
  const classifiedDiffCY = Math.round((classifiedSumCY - totalCY) * 100) / 100;
  const isClassifiedReconciled = Math.abs(classifiedDiffCY) < 0.05;

  const classifiedSumPY = (form.msmeAmountPY || 0) + (form.othersAmountPY || 0);
  const classifiedDiffPY = Math.round((classifiedSumPY - totalPY) * 100) / 100;

  // Aging totals
  const totalAgingMsme = (form.agingMsmeLess1Yr || 0) + (form.agingMsme1To2Yrs || 0) + (form.agingMsme2To3Yrs || 0) + (form.agingMsmeMore3Yrs || 0);
  const totalAgingOthers = (form.agingOthersLess1Yr || 0) + (form.agingOthers1To2Yrs || 0) + (form.agingOthers2To3Yrs || 0) + (form.agingOthersMore3Yrs || 0);
  const totalAgingDisputedMsme = (form.agingDisputedMsmeLess1Yr || 0) + (form.agingDisputedMsme1To2Yrs || 0) + (form.agingDisputedMsme2To3Yrs || 0) + (form.agingDisputedMsmeMore3Yrs || 0);
  const totalAgingDisputedOthers = (form.agingDisputedOthersLess1Yr || 0) + (form.agingDisputedOthers1To2Yrs || 0) + (form.agingDisputedOthers2To3Yrs || 0) + (form.agingDisputedOthersMore3Yrs || 0);

  const grandTotalAging = totalAgingMsme + totalAgingOthers + totalAgingDisputedMsme + totalAgingDisputedOthers;
  const agingDiffCY = Math.round((grandTotalAging - totalCY) * 100) / 100;
  const isAgingReconciled = Math.abs(agingDiffCY) < 0.05;

  const handleNumChange = (field: keyof TradePayablesMsmeConfig, valStr: string) => {
    const num = parseFloat(valStr.replace(/,/g, ''));
    setForm((prev) => ({
      ...prev,
      [field]: isNaN(num) ? 0 : Math.round(num * 100) / 100,
    }));
  };

  // Helper actions
  const autoBalanceOthers = () => {
    const msme = form.msmeAmountCY || 0;
    const computedOthers = Math.max(0, Math.round((totalCY - msme) * 100) / 100);
    setForm((prev) => ({
      ...prev,
      othersAmountCY: computedOthers,
    }));
    setStatusMsg({ type: 'success', text: `Balanced! 'Others' set to ₹${computedOthers.toLocaleString('en-IN')}. Difference is now ₹0.00.` });
  };

  const autoFillAgingFromSubclassification = () => {
    setForm((prev) => ({
      ...prev,
      agingMsmeLess1Yr: prev.msmeAmountCY || 0,
      agingMsme1To2Yrs: 0,
      agingMsme2To3Yrs: 0,
      agingMsmeMore3Yrs: 0,

      agingOthersLess1Yr: prev.othersAmountCY || 0,
      agingOthers1To2Yrs: 0,
      agingOthers2To3Yrs: 0,
      agingOthersMore3Yrs: 0,

      agingDisputedMsmeLess1Yr: 0,
      agingDisputedMsme1To2Yrs: 0,
      agingDisputedMsme2To3Yrs: 0,
      agingDisputedMsmeMore3Yrs: 0,

      agingDisputedOthersLess1Yr: 0,
      agingDisputedOthers1To2Yrs: 0,
      agingDisputedOthers2To3Yrs: 0,
      agingDisputedOthersMore3Yrs: 0,
    }));
    setStatusMsg({ type: 'success', text: 'Aging schedule auto-populated to < 1 Year bucket. Fully reconciled!' });
  };

  const syncSec22WithMsme = () => {
    setForm((prev) => ({
      ...prev,
      msmeSec22PrincipalCY: prev.msmeAmountCY || 0,
      msmeSec22PrincipalPY: prev.msmeAmountPY || 0,
    }));
    setStatusMsg({ type: 'info', text: 'Synced Section 22 Principal Amount with (a) MSME Dues.' });
  };

  const handleSave = () => {
    onUpdateConfig({
      tradePayablesConfig: form,
    });
    setStatusMsg({ type: 'success', text: 'Trade Payables MSME & Aging disclosures saved successfully!' });
    setTimeout(() => {
      onClose();
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <Sliders className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  Trade Payables: Statutory Disclosures &amp; Reconciliation Manager (Note 9)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ICAI Guidance Note &amp; MSMED Act
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Configure MSME classification, Section 22 disclosures, and Aging Schedule with live Trial Balance reconciliation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Reconciliation Bar */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Trial Balance Total Note 9:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-300 shadow-2xs">
                {formatINR(totalCY)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Classified Sum (MSME + Others):</span>
              <span className={`font-mono font-bold px-2.5 py-0.5 rounded border shadow-2xs ${
                isClassifiedReconciled
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}>
                {formatINR(classifiedSumCY)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Aging Grand Total:</span>
              <span className={`font-mono font-bold px-2.5 py-0.5 rounded border shadow-2xs ${
                isAgingReconciled
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}>
                {formatINR(grandTotalAging)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isClassifiedReconciled && isAgingReconciled ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fully Reconciled to Trial Balance</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Diff: ₹{formatINR(Math.abs(classifiedDiffCY || agingDiffCY))}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('sub_classification')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'sub_classification'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>1. Sub-Classification (MSME vs Others)</span>
            {!isClassifiedReconciled && (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('section_22')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'section_22'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>2. MSMED Act (Section 22 Disclosures)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('aging_schedule')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'aging_schedule'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>3. Trade Payables Aging Schedule</span>
            {!isAgingReconciled && (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>
        </div>

        {/* Feedback Message */}
        {statusMsg && (
          <div
            className={`mx-6 mt-3 px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : statusMsg.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            <span>{statusMsg.text}</span>
            <button
              type="button"
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-slate-700 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-800">
          
          {/* TAB 1: SUB-CLASSIFICATION */}
          {activeTab === 'sub_classification' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Statutory Sub-Classification Breakdown
                  </h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    As prescribed by the ICAI Guidance Note on Non-Corporate Entities, Trade Payables must be sub-classified into MSME dues and Other creditors.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={autoBalanceOthers}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-2xs transition"
                    title="Calculate Others = Total Note 9 - MSME Amount"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Auto-Balance Others</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        msmeAmountCY: 0,
                        othersAmountCY: totalCY,
                      }));
                      setStatusMsg({ type: 'info', text: 'Set all creditors as Others (Zero MSME).' });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition"
                  >
                    <span>All Others</span>
                  </button>
                </div>
              </div>

              {/* Sub-classification Input Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">Clause</th>
                      <th className="py-2.5 px-4">Statutory Schedule Head</th>
                      <th className="py-2.5 px-4 w-52 text-right">Current Period ({config.reportingPeriod}) (₹)</th>
                      <th className="py-2.5 px-4 w-52 text-right">Previous Period ({config.previousReportingPeriod || 'PY'}) (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-emerald-800 text-center">(a)</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">
                          Total outstanding dues of micro, small and medium enterprises (MSME)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Creditors registered under the Micro, Small and Medium Enterprises Development Act, 2006
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={form.msmeAmountCY ?? 0}
                          onChange={(e) => handleNumChange('msmeAmountCY', e.target.value)}
                          className="w-full text-right font-mono font-bold text-slate-900 px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={form.msmeAmountPY ?? 0}
                          onChange={(e) => handleNumChange('msmeAmountPY', e.target.value)}
                          className="w-full text-right font-mono text-slate-600 px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-slate-700 text-center">(b)</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">
                          Total outstanding dues of creditors other than micro, small and medium enterprises
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Regular vendors, corporate suppliers, professionals, and unregistered suppliers
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={form.othersAmountCY ?? 0}
                          onChange={(e) => handleNumChange('othersAmountCY', e.target.value)}
                          className="w-full text-right font-mono font-bold text-slate-900 px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={form.othersAmountPY ?? 0}
                          onChange={(e) => handleNumChange('othersAmountPY', e.target.value)}
                          className="w-full text-right font-mono text-slate-600 px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                    </tr>

                    {/* Total Row */}
                    <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                      <td className="py-3 px-4 text-center"></td>
                      <td className="py-3 px-4 uppercase text-slate-950">
                        Total Trade Payables (Schedule Note 9)
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-slate-950">
                        {formatINR(classifiedSumCY)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-slate-600">
                        {formatINR(classifiedSumPY)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Reconciliation Details Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase">Trial Balance Reconciliation Audit Check</span>
                  {isClassifiedReconciled ? (
                    <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Fully Reconciled (Difference: ₹0.00)
                    </span>
                  ) : (
                    <span className="font-bold text-amber-700 inline-flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Difference: ₹{formatINR(Math.abs(classifiedDiffCY))}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px]">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Total fetched from Trial Balance:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{formatINR(totalCY)}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Total Classified (MSME + Others):</span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{formatINR(classifiedSumCY)}</span>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    isClassifiedReconciled ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <span className="text-slate-500 block">Reconciliation Status:</span>
                    <span className={`font-mono font-bold text-sm mt-0.5 block ${
                      isClassifiedReconciled ? 'text-emerald-800' : 'text-amber-800'
                    }`}>
                      {isClassifiedReconciled ? 'Reconciled (₹0.00)' : `Variance: ₹${formatINR(classifiedDiffCY)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MSMED ACT SECTION 22 DISCLOSURES */}
          {activeTab === 'section_22' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                    Disclosure Under Section 22 of MSMED Act, 2006
                  </h4>
                  <p className="text-[11px] text-indigo-800 mt-0.5">
                    Mandatory statutory footnotes for delayed payments and accrued interest on micro and small enterprise dues.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={syncSec22WithMsme}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-lg shadow-2xs transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Principal with (a) MSME Dues</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">Clause</th>
                      <th className="py-2.5 px-4">Statutory Particulars</th>
                      <th className="py-2.5 px-4 w-48 text-right">CY ({config.reportingPeriod}) (₹)</th>
                      <th className="py-2.5 px-4 w-48 text-right">PY ({config.previousReportingPeriod || 'PY'}) (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    
                    {/* Clause (a) */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-indigo-800 text-center align-top pt-3">(a)</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold block text-slate-900">
                          Principal amount and interest due thereon remaining unpaid to any supplier as at year-end:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                          <div>
                            <label className="text-[11px] text-slate-500 font-medium block">Principal Amount (₹):</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.msmeSec22PrincipalCY ?? 0}
                              onChange={(e) => handleNumChange('msmeSec22PrincipalCY', e.target.value)}
                              className="w-full text-right font-mono text-slate-900 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 font-medium block">Interest Due Thereon (₹):</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.msmeSec22InterestCY ?? 0}
                              onChange={(e) => handleNumChange('msmeSec22InterestCY', e.target.value)}
                              className="w-full text-right font-mono text-slate-900 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold align-top pt-3 text-slate-900">
                        {formatINR((form.msmeSec22PrincipalCY || 0) + (form.msmeSec22InterestCY || 0))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500 align-top pt-3">
                        {formatINR((form.msmeSec22PrincipalPY || 0) + (form.msmeSec22InterestPY || 0))}
                      </td>
                    </tr>

                    {/* Clause (b) */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-indigo-800 text-center align-top pt-3">(b)</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold block text-slate-900">
                          Interest paid by buyer under Sec 16 along with payments made beyond appointed day:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                          <div>
                            <label className="text-[11px] text-slate-500 font-medium block">Delayed Payments Made (₹):</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.msmeSec22DelayedPaymentsCY ?? 0}
                              onChange={(e) => handleNumChange('msmeSec22DelayedPaymentsCY', e.target.value)}
                              className="w-full text-right font-mono text-slate-900 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 font-medium block">Interest Paid under Sec 16 (₹):</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.msmeSec22InterestPaidCY ?? 0}
                              onChange={(e) => handleNumChange('msmeSec22InterestPaidCY', e.target.value)}
                              className="w-full text-right font-mono text-slate-900 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono align-top pt-3 font-semibold text-slate-900">
                        {formatINR(form.msmeSec22InterestPaidCY || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500 align-top pt-3">
                        {formatINR(form.msmeSec22InterestPaidPY || 0)}
                      </td>
                    </tr>

                    {/* Clause (c) */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-indigo-800 text-center align-top pt-3">(c)</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold block text-slate-900">
                          Interest due &amp; payable for delay in payment (without adding interest under MSMED Act):
                        </span>
                        <div className="w-48 mt-1.5">
                          <input
                            type="number"
                            step="0.01"
                            value={form.msmeSec22InterestDueDelayCY ?? 0}
                            onChange={(e) => handleNumChange('msmeSec22InterestDueDelayCY', e.target.value)}
                            className="w-full text-right font-mono text-slate-900 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono align-top pt-3 font-semibold text-slate-900">
                        {formatINR(form.msmeSec22InterestDueDelayCY || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500 align-top pt-3">
                        {formatINR(form.msmeSec22InterestDueDelayPY || 0)}
                      </td>
                    </tr>

                    {/* Clause (d) */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-indigo-800 text-center align-top pt-3">(d)</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold block text-slate-900">
                          Interest accrued and remaining unpaid at the end of each accounting year:
                        </span>
                        <div className="w-48 mt-1.5">
                          <input
                            type="number"
                            step="0.01"
                            value={form.msmeSec22InterestAccruedCY ?? 0}
                            onChange={(e) => handleNumChange('msmeSec22InterestAccruedCY', e.target.value)}
                            className="w-full text-right font-mono text-slate-900 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono align-top pt-3 font-semibold text-slate-900">
                        {formatINR(form.msmeSec22InterestAccruedCY || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500 align-top pt-3">
                        {formatINR(form.msmeSec22InterestAccruedPY || 0)}
                      </td>
                    </tr>

                    {/* Clause (e) */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-indigo-800 text-center align-top pt-3">(e)</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold block text-slate-900">
                          Further interest remaining due and payable in succeeding years until actually paid:
                        </span>
                        <div className="w-48 mt-1.5">
                          <input
                            type="number"
                            step="0.01"
                            value={form.msmeSec22FurtherInterestCY ?? 0}
                            onChange={(e) => handleNumChange('msmeSec22FurtherInterestCY', e.target.value)}
                            className="w-full text-right font-mono text-slate-900 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono align-top pt-3 font-semibold text-slate-900">
                        {formatINR(form.msmeSec22FurtherInterestCY || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500 align-top pt-3">
                        {formatINR(form.msmeSec22FurtherInterestPY || 0)}
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AGING SCHEDULE */}
          {activeTab === 'aging_schedule' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                    Trade Payables Aging Schedule as at {config.reportingPeriod}
                  </h4>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Statutory aging buckets categorized from due date or transaction date. Grand total must reconcile with Trial Balance Note 9.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={autoFillAgingFromSubclassification}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-2xs transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Fill (&lt; 1 Year Bucket)</span>
                </button>
              </div>

              {/* Aging Input Matrix */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 w-52">Particulars</th>
                      <th className="py-2.5 px-2 text-right">&lt; 1 Year (₹)</th>
                      <th className="py-2.5 px-2 text-right">1 - 2 Years (₹)</th>
                      <th className="py-2.5 px-2 text-right">2 - 3 Years (₹)</th>
                      <th className="py-2.5 px-2 text-right">&gt; 3 Years (₹)</th>
                      <th className="py-2.5 px-4 w-36 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    
                    {/* (i) MSME */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-emerald-900">
                        (i) MSME
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingMsmeLess1Yr ?? 0}
                          onChange={(e) => handleNumChange('agingMsmeLess1Yr', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingMsme1To2Yrs ?? 0}
                          onChange={(e) => handleNumChange('agingMsme1To2Yrs', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingMsme2To3Yrs ?? 0}
                          onChange={(e) => handleNumChange('agingMsme2To3Yrs', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingMsmeMore3Yrs ?? 0}
                          onChange={(e) => handleNumChange('agingMsmeMore3Yrs', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-900">
                        {formatINR(totalAgingMsme)}
                      </td>
                    </tr>

                    {/* (ii) Others */}
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-800">
                        (ii) Others
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingOthersLess1Yr ?? 0}
                          onChange={(e) => handleNumChange('agingOthersLess1Yr', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingOthers1To2Yrs ?? 0}
                          onChange={(e) => handleNumChange('agingOthers1To2Yrs', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingOthers2To3Yrs ?? 0}
                          onChange={(e) => handleNumChange('agingOthers2To3Yrs', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingOthersMore3Yrs ?? 0}
                          onChange={(e) => handleNumChange('agingOthersMore3Yrs', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(totalAgingOthers)}
                      </td>
                    </tr>

                    {/* (iii) Disputed dues - MSME */}
                    <tr className="hover:bg-slate-50/70 text-slate-600">
                      <td className="py-2.5 px-4 font-medium">
                        (iii) Disputed dues - MSME
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingDisputedMsmeLess1Yr ?? 0}
                          onChange={(e) => handleNumChange('agingDisputedMsmeLess1Yr', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingDisputedMsme1To2Yrs ?? 0}
                          onChange={(e) => handleNumChange('agingDisputedMsme1To2Yrs', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingDisputedMsme2To3Yrs ?? 0}
                          onChange={(e) => handleNumChange('agingDisputedMsme2To3Yrs', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingDisputedMsmeMore3Yrs ?? 0}
                          onChange={(e) => handleNumChange('agingDisputedMsmeMore3Yrs', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-700">
                        {formatINR(totalAgingDisputedMsme)}
                      </td>
                    </tr>

                    {/* (iv) Disputed dues - Others */}
                    <tr className="hover:bg-slate-50/70 text-slate-600">
                      <td className="py-2.5 px-4 font-medium">
                        (iv) Disputed dues - Others
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingDisputedOthersLess1Yr ?? 0}
                          onChange={(e) => handleNumChange('agingDisputedOthersLess1Yr', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingDisputedOthers1To2Yrs ?? 0}
                          onChange={(e) => handleNumChange('agingDisputedOthers1To2Yrs', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingDisputedOthers2To3Yrs ?? 0}
                          onChange={(e) => handleNumChange('agingDisputedOthers2To3Yrs', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={form.agingDisputedOthersMore3Yrs ?? 0}
                          onChange={(e) => handleNumChange('agingDisputedOthersMore3Yrs', e.target.value)}
                          className="w-full text-right font-mono px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-700">
                        {formatINR(totalAgingDisputedOthers)}
                      </td>
                    </tr>

                    {/* Grand Total Row */}
                    <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                      <td className="py-3 px-4 uppercase text-slate-950">
                        Total Trade Payables Aging
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-slate-950">
                        {formatINR((form.agingMsmeLess1Yr || 0) + (form.agingOthersLess1Yr || 0) + (form.agingDisputedMsmeLess1Yr || 0) + (form.agingDisputedOthersLess1Yr || 0))}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-slate-950">
                        {formatINR((form.agingMsme1To2Yrs || 0) + (form.agingOthers1To2Yrs || 0) + (form.agingDisputedMsme1To2Yrs || 0) + (form.agingDisputedOthers1To2Yrs || 0))}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-slate-950">
                        {formatINR((form.agingMsme2To3Yrs || 0) + (form.agingOthers2To3Yrs || 0) + (form.agingDisputedMsme2To3Yrs || 0) + (form.agingDisputedOthers2To3Yrs || 0))}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-slate-950">
                        {formatINR((form.agingMsmeMore3Yrs || 0) + (form.agingOthersMore3Yrs || 0) + (form.agingDisputedMsmeMore3Yrs || 0) + (form.agingDisputedOthersMore3Yrs || 0))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-emerald-900">
                        {formatINR(grandTotalAging)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Aging Reconciliation Status Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                isAgingReconciled ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-center gap-2.5">
                  {isAgingReconciled ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {isAgingReconciled
                        ? 'Aging Schedule Tally Validated'
                        : 'Aging Schedule Out of Balance with Trial Balance'}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Total Aging: {formatINR(grandTotalAging)} vs Trial Balance Note 9: {formatINR(totalCY)} (Difference: {formatINR(Math.abs(agingDiffCY))})
                    </span>
                  </div>
                </div>

                {!isAgingReconciled && (
                  <button
                    type="button"
                    onClick={autoFillAgingFromSubclassification}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition"
                  >
                    Auto-reconcile Aging
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Saved disclosures will automatically reflect in the Balance Sheet, Note 9, and Excel export reports.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save &amp; Apply Disclosures</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
