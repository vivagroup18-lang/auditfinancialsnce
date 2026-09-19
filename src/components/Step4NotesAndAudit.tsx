import React, { useState } from 'react';
import {
  FileSpreadsheet,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Search,
  Box,
  Layers,
  FileCheck,
} from 'lucide-react';
import {
  NoteScheduleData,
  EntityConfig,
  AuditException,
  BalanceSheetData,
  ProfitAndLossData,
} from '../types';
import { NotesView } from './NotesView';
import { AuditReportView } from './AuditReportView';

interface Step4NotesAndAuditProps {
  config: EntityConfig;
  noteSchedules: Record<number, NoteScheduleData>;
  exceptions: AuditException[];
  balanceSheet: BalanceSheetData;
  profitAndLoss: ProfitAndLossData;
  onUpdateConfig: (updated: Partial<EntityConfig>) => void;
  onSelectNote: (noteNumber: number) => void;
  selectedNoteNumber?: number;
  onOpenYearEndAdjustments: () => void;
  onBackToStep3: () => void;
  onProceedToStep5: () => void;
}

export const Step4NotesAndAudit: React.FC<Step4NotesAndAuditProps> = ({
  config,
  noteSchedules,
  exceptions,
  balanceSheet,
  profitAndLoss,
  onUpdateConfig,
  onSelectNote,
  selectedNoteNumber,
  onOpenYearEndAdjustments,
  onBackToStep3,
  onProceedToStep5,
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'audit_exceptions'>('notes');

  const highSeverityCount = exceptions.filter((e) => e.severity === 'high').length;
  const mediumSeverityCount = exceptions.filter((e) => e.severity === 'medium').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                Step 4 of 5
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Statutory Compliance & Audit Verification • Notes 1–25
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Statutory Notes & Audit Exception Checks
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Review all 25 statutory schedules to accounts and verify forensic and tax audit flags under ICAI and Income Tax guidelines.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onBackToStep3}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Step 3</span>
            </button>

            <button
              type="button"
              onClick={onProceedToStep5}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <span>Proceed to Step 5: Report Generation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inner Tabs */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Statutory Notes (Notes 1–25)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit_exceptions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'audit_exceptions'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Audit Exception Checks ({exceptions.length})</span>
              {exceptions.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    highSeverityCount > 0
                      ? 'bg-rose-500 text-white'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {highSeverityCount > 0 ? `${highSeverityCount} High` : `${exceptions.length} Items`}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenYearEndAdjustments}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <Box className="w-3.5 h-3.5 text-emerald-600" />
              <span>Year-End Adjustments</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Statutory Notes (1–25) */}
      {activeTab === 'notes' && (
        <NotesView
          noteSchedules={noteSchedules}
          config={config}
          selectedNoteNumber={selectedNoteNumber}
          onOpenYearEndAdjustments={onOpenYearEndAdjustments}
          onUpdateConfig={onUpdateConfig}
          profitAndLoss={profitAndLoss}
        />
      )}

      {/* Tab 2: Audit Exception Checks & Verification */}
      {activeTab === 'audit_exceptions' && (
        <AuditReportView
          exceptions={exceptions}
          config={config}
          balanceSheet={balanceSheet}
          profitAndLoss={profitAndLoss}
          onUpdateConfig={onUpdateConfig}
          onSelectNote={onSelectNote}
        />
      )}

      {/* Bottom Step Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToStep3}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Step 3: Comparative Statements</span>
        </button>

        <div className="text-xs text-slate-500">
          Step 4 of 5 • Statutory Notes & Audit Checks
        </div>

        <button
          type="button"
          onClick={onProceedToStep5}
          className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <span>Proceed to Step 5: Report Generation</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
