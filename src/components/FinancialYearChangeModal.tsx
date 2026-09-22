import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  ChevronRight,
  RotateCw,
  ArrowRightLeft,
  FastForward,
  Rewind,
  Check,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { EntityConfig } from '../types';
import {
  POPULAR_INDIAN_FY_PRESETS,
  derivePriorYearDetails,
  rollForwardOneYear,
  rollBackOneYear,
} from '../utils/financialYearUtils';

interface FinancialYearChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EntityConfig;
  onSave: (updatedConfig: EntityConfig) => void;
}

export const FinancialYearChangeModal: React.FC<FinancialYearChangeModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [cyYear, setCyYear] = useState(config.financialYear || '2025-26');
  const [cyPeriod, setCyPeriod] = useState(config.reportingPeriod || 'March 31, 2026');
  const [pyYear, setPyYear] = useState(config.previousFinancialYear || '2024-25');
  const [pyPeriod, setPyPeriod] = useState(config.previousReportingPeriod || 'March 31, 2025');
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    setCyYear(config.financialYear || '2025-26');
    setCyPeriod(config.reportingPeriod || 'March 31, 2026');
    setPyYear(config.previousFinancialYear || '2024-25');
    setPyPeriod(config.previousReportingPeriod || 'March 31, 2025');
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleCYChange = (newCY: string) => {
    setCyYear(newCY);
    if (autoSync) {
      const derived = derivePriorYearDetails(newCY);
      setCyPeriod(derived.cyPeriod);
      setPyYear(derived.pyYear);
      setPyPeriod(derived.pyPeriod);
    }
  };

  const handleApplyPreset = (presetCY: string, presetCYPeriod: string, presetPY: string, presetPYPeriod: string) => {
    setCyYear(presetCY);
    setCyPeriod(presetCYPeriod);
    setPyYear(presetPY);
    setPyPeriod(presetPYPeriod);
  };

  const handleRollForward = () => {
    const rolled = rollForwardOneYear(cyYear);
    setCyYear(rolled.newCY);
    setCyPeriod(rolled.newCYPeriod);
    setPyYear(rolled.newPY);
    setPyPeriod(rolled.newPYPeriod);
  };

  const handleRollBack = () => {
    const rolled = rollBackOneYear(cyYear);
    setCyYear(rolled.newCY);
    setCyPeriod(rolled.newCYPeriod);
    setPyYear(rolled.newPY);
    setPyPeriod(rolled.newPYPeriod);
  };

  const handleSwapYears = () => {
    const tempCY = cyYear;
    const tempCYPeriod = cyPeriod;
    setCyYear(pyYear);
    setCyPeriod(pyPeriod);
    setPyYear(tempCY);
    setPyPeriod(tempCYPeriod);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...config,
      financialYear: cyYear.trim(),
      reportingPeriod: cyPeriod.trim(),
      previousFinancialYear: pyYear.trim(),
      previousReportingPeriod: pyPeriod.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Change Financial Year & Comparative Period</h3>
              <p className="text-[11px] text-slate-400">
                Entity: <strong className="text-emerald-300 font-semibold">{config.entityName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition rounded-lg p-1.5 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Quick 1-Click Indian FY Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>Standard Assessment / Financial Year Presets</span>
              </span>
              <span className="text-[11px] text-slate-500">Click to load</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {POPULAR_INDIAN_FY_PRESETS.map((p) => {
                const isSelected = cyYear === p.cyYear && pyYear === p.pyYear;
                return (
                  <button
                    key={p.cyYear}
                    type="button"
                    onClick={() => handleApplyPreset(p.cyYear, p.cyPeriod, p.pyYear, p.pyPeriod)}
                    className={`text-left p-2.5 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5 flex-wrap">
                        <span>FY {p.cyYear}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-200/80 text-slate-700">
                          CY
                        </span>
                        <span className="text-slate-400 font-normal">&</span>
                        <span className="text-slate-600 font-semibold">FY {p.pyYear}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-200/80 text-slate-700">
                          PY
                        </span>
                        {p.isCurrentActive && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-600 text-white shadow-2xs">
                            Active Audit Year
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        A.Y. {p.assessmentYear} • As on {p.cyPeriod}
                      </div>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-1.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Roll Actions (Roll Forward / Backward / Swap) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                Quick Adjust Actions
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleRollBack}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px] transition shadow-2xs"
                title="Shift by -1 Financial Year (e.g. 2025-26 -> 2024-25)"
              >
                <Rewind className="w-3.5 h-3.5 text-slate-500" />
                <span>Roll Back (-1 Yr)</span>
              </button>

              <button
                type="button"
                onClick={handleSwapYears}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px] transition shadow-2xs"
                title="Swap Current Year and Previous Year"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Swap CY ⇄ PY</span>
              </button>

              <button
                type="button"
                onClick={handleRollForward}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-medium text-[11px] transition shadow-2xs"
                title="Advance by +1 Financial Year (e.g. 2025-26 -> 2026-27)"
              >
                <FastForward className="w-3.5 h-3.5 text-emerald-600" />
                <span>Roll Forward (+1 Yr)</span>
              </button>
            </div>
          </div>

          {/* Custom Year Inputs (Current Year & Previous Year) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Custom Financial Year & Date Values</span>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Auto-sync PY & dates when CY changes</span>
              </label>
            </div>

            {/* Current Year Fields */}
            <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                    C
                  </span>
                  Current Year (CY) Parameters
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Primary Statement Period
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Financial Year (e.g. 2025-26) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cyYear}
                    onChange={(e) => handleCYChange(e.target.value)}
                    placeholder="2025-26"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-semibold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Reporting Date / Period <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cyPeriod}
                    onChange={(e) => setCyPeriod(e.target.value)}
                    placeholder="March 31, 2026"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-900"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Previous Year Fields */}
            <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    P
                  </span>
                  Previous Year (PY) Parameters
                </span>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  Comparative Figures Column
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Previous Financial Year (e.g. 2024-25) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pyYear}
                    onChange={(e) => setPyYear(e.target.value)}
                    placeholder="2024-25"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Previous Reporting Date / Period <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pyPeriod}
                    onChange={(e) => setPyPeriod(e.target.value)}
                    placeholder="March 31, 2025"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-900"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply Financial Years</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
