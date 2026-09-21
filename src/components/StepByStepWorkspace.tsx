import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  FileSpreadsheet,
  Layers,
  FileCheck,
  Download,
  Box,
  Settings,
  Sliders,
} from 'lucide-react';
import {
  EntityConfig,
  MappedLedger,
  BalanceSheetData,
  ProfitAndLossData,
  NoteScheduleData,
  AuditException,
  UserProfile,
} from '../types';
import { computePeriodTotals } from '../utils/financialCalculations';
import { Step1CurrentYear } from './Step1CurrentYear';
import { Step2PreviousYear } from './Step2PreviousYear';
import { Step3ComparativeStatements } from './Step3ComparativeStatements';
import { Step4NotesAndAudit } from './Step4NotesAndAudit';
import { Step5ReportGeneration } from './Step5ReportGeneration';
import { TradePayablesMsmeModal } from './TradePayablesMsmeModal';
import type { User } from 'firebase/auth';

interface StepByStepWorkspaceProps {
  config: EntityConfig;
  mappedLedgers: MappedLedger[];
  totalDebit: number;
  totalCredit: number;
  isTallyBalanced: boolean;
  tallyDifference: number;
  tbFileName?: string;
  onUploadTB: (file: File) => void;
  onClearTB: () => void;
  onLoadSample: (datasetId: string) => void;
  onUpdateLedgerNote: (ledgerId: string, newNoteNumber: number) => void;
  onUpdateLedgerDetails?: (ledgerId: string, updatedFields: Partial<MappedLedger>, isPY?: boolean) => void;
  onAddLedger?: (newLedger: Partial<MappedLedger>, isPY?: boolean) => void;
  onDeleteLedger?: (ledgerId: string, isPY?: boolean) => void;
  onTriggerAIMap: () => void;
  isAIMapping: boolean;
  onOpenYearEndAdjustments: () => void;
  onOpenConfig: () => void;
  onOpenYearModal?: () => void;

  // Previous Year
  pyMappedLedgers: MappedLedger[];
  pyTotalDebit: number;
  pyTotalCredit: number;
  isPYTallyBalanced: boolean;
  pyTallyDifference: number;
  pyFileName?: string;
  onUploadPYTB: (file: File) => void;
  onClearPYTB: () => void;
  onUpdatePyLedgerNote: (ledgerId: string, newNoteNumber: number) => void;

  // Computed Statements & Notes
  computedFinancials: {
    balanceSheet: BalanceSheetData;
    profitAndLoss: ProfitAndLossData;
    noteSchedules: Record<number, NoteScheduleData>;
    computationExceptions: AuditException[];
  };
  allExceptions: AuditException[];

  // Report Generation & Export
  onExportExcel: () => void;
  onOpenBackupRestore?: () => void;
  onUpdateConfig: (updated: Partial<EntityConfig>) => void;

  // Navigation
  onSwitchCompany: () => void;
  initialStep?: 1 | 2 | 3 | 4 | 5;
  onStepChange?: (step: 1 | 2 | 3 | 4 | 5) => void;

  // Auth & Cloud
  currentUser?: UserProfile | null;
  onOpenSubscriptionModal?: () => void;
  user?: User | null;
  accessToken?: string | null;
  onAuthSuccess?: (user: User, token: string) => void;
  onSignOut?: () => void;
}

export const StepByStepWorkspace: React.FC<StepByStepWorkspaceProps> = ({
  config,
  mappedLedgers,
  totalDebit,
  totalCredit,
  isTallyBalanced,
  tallyDifference,
  tbFileName,
  onUploadTB,
  onClearTB,
  onLoadSample,
  onUpdateLedgerNote,
  onUpdateLedgerDetails,
  onAddLedger,
  onDeleteLedger,
  onTriggerAIMap,
  isAIMapping,
  onOpenYearEndAdjustments,
  onOpenConfig,
  onOpenYearModal,
  pyMappedLedgers,
  pyTotalDebit,
  pyTotalCredit,
  isPYTallyBalanced,
  pyTallyDifference,
  pyFileName,
  onUploadPYTB,
  onClearPYTB,
  onUpdatePyLedgerNote,
  computedFinancials,
  allExceptions,
  onExportExcel,
  onOpenBackupRestore,
  onUpdateConfig,
  onSwitchCompany,
  initialStep = 1,
  onStepChange,
  currentUser,
  onOpenSubscriptionModal,
  user,
  accessToken,
  onAuthSuccess,
  onSignOut,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(initialStep);

  // Keep internal step synchronized with parent/header selection
  useEffect(() => {
    if (initialStep !== undefined) {
      setCurrentStep(initialStep);
    }
  }, [initialStep]);

  const handleStepChange = (step: 1 | 2 | 3 | 4 | 5) => {
    setCurrentStep(step);
    if (onStepChange) {
      onStepChange(step);
    }
  };

  const [selectedNoteNumber, setSelectedNoteNumber] = useState<number | undefined>(undefined);
  const [isTradePayablesModalOpen, setIsTradePayablesModalOpen] = useState(false);

  const handleOpenTradePayables = () => {
    setIsTradePayablesModalOpen(true);
  };

  // Compute standalone Previous Year totals for Step 2 if PY ledgers exist
  const pyComputedFinancials = useMemo(() => {
    if (!pyMappedLedgers || pyMappedLedgers.length === 0) return null;
    try {
      return computePeriodTotals(pyMappedLedgers, config, 'Previous Period');
    } catch {
      return null;
    }
  }, [pyMappedLedgers, config]);

  const hasCYData = mappedLedgers && mappedLedgers.length > 0;
  const hasPYData = pyMappedLedgers && pyMappedLedgers.length > 0;

  const STEPS = [
    {
      step: 1,
      title: 'Current Year',
      subtitle: 'TB, Mapping & Statements',
      isCompleted: hasCYData,
    },
    {
      step: 2,
      title: 'Previous Year',
      subtitle: 'Comparative TB & Notes',
      isCompleted: hasPYData,
    },
    {
      step: 3,
      title: 'Comparative Statements',
      subtitle: 'Consolidated BS & P&L',
      isCompleted: hasCYData,
    },
    {
      step: 4,
      title: 'Notes & Audit Checks',
      subtitle: 'ICAI Notes 1–25 & Flags',
      isCompleted: hasCYData,
    },
    {
      step: 5,
      title: 'Generate Report',
      subtitle: 'Excel, PDF & Transmittal',
      isCompleted: false,
    },
  ];

  const handleSelectNote = (noteNumber: number) => {
    setSelectedNoteNumber(noteNumber);
    handleStepChange(4);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP STEPPER & ACTIVE COMPANY BAR                                      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
        {/* Company Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSwitchCompany}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>← Switch / Add Company</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {config.entityName || 'Active Entity'}
              </h1>
              <span className="hidden md:inline-block text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                {config.entityType}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="text-xs text-slate-500 font-medium">
              Reporting Period: <strong className="text-emerald-700 font-bold">FY {config.financialYear}</strong>
            </div>

            {onOpenYearModal && (
              <button
                type="button"
                onClick={onOpenYearModal}
                className="text-[11px] text-indigo-700 hover:underline font-semibold"
              >
                Change FY
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenTradePayables}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Edit Note 9 Creditors MSME & Aging Data"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Creditors MSME Data</span>
            </button>

            <button
              type="button"
              onClick={onOpenConfig}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              title="Edit Entity Config & Auditor Rules"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 5-Step Guided Stepper Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 pt-1">
          {STEPS.map((s) => {
            const isCurrent = currentStep === s.step;
            const isCompleted = s.isCompleted && !isCurrent;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => handleStepChange(s.step as any)}
                className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between gap-2 cursor-pointer ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/25 scale-[1.01]'
                    : isCompleted
                    ? 'bg-emerald-50/80 border-emerald-300/80 text-emerald-950 hover:bg-emerald-100 shadow-2xs'
                    : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center transition shrink-0 ${
                      isCurrent
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-150 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
                  </span>

                  <span
                    className={`text-[9px] uppercase tracking-wider font-extrabold ${
                      isCurrent
                        ? 'text-emerald-400'
                        : isCompleted
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {isCurrent ? 'Current' : isCompleted ? 'Completed' : `Step ${s.step}`}
                  </span>
                </div>

                <div>
                  <div className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                    {s.title}
                  </div>
                  <div
                    className={`text-[10px] truncate mt-0.5 ${
                      isCurrent ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {s.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DEDICATED STEP WINDOW                                                  */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <Step1CurrentYear
          config={config}
          mappedLedgers={mappedLedgers}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          isTallyBalanced={isTallyBalanced}
          tallyDifference={tallyDifference}
          tbFileName={tbFileName}
          onUploadTB={onUploadTB}
          onClearTB={onClearTB}
          onLoadSample={onLoadSample}
          onUpdateLedgerNote={onUpdateLedgerNote}
          onUpdateLedgerDetails={onUpdateLedgerDetails}
          onAddLedger={onAddLedger}
          onDeleteLedger={onDeleteLedger}
          onTriggerAIMap={onTriggerAIMap}
          isAIMapping={isAIMapping}
          onOpenYearEndAdjustments={onOpenYearEndAdjustments}
          computedFinancials={computedFinancials}
          onProceedToStep2={() => handleStepChange(2)}
          onSelectNote={handleSelectNote}
          onOpenTradePayables={handleOpenTradePayables}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {currentStep === 2 && (
        <Step2PreviousYear
          config={config}
          pyMappedLedgers={pyMappedLedgers}
          pyTotalDebit={pyTotalDebit}
          pyTotalCredit={pyTotalCredit}
          isPYTallyBalanced={isPYTallyBalanced}
          pyTallyDifference={pyTallyDifference}
          pyFileName={pyFileName}
          onUploadPYTB={onUploadPYTB}
          onClearPYTB={onClearPYTB}
          onUpdatePyLedgerNote={onUpdatePyLedgerNote}
          onUpdateLedgerDetails={onUpdateLedgerDetails}
          onAddLedger={onAddLedger}
          onDeleteLedger={onDeleteLedger}
          onTriggerAIMap={onTriggerAIMap}
          isAIMapping={isAIMapping}
          pyComputedFinancials={pyComputedFinancials}
          onBackToStep1={() => handleStepChange(1)}
          onProceedToStep3={() => handleStepChange(3)}
          onSelectNote={handleSelectNote}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {currentStep === 3 && (
        <Step3ComparativeStatements
          config={config}
          computedFinancials={computedFinancials}
          onBackToStep2={() => handleStepChange(2)}
          onProceedToStep4={() => handleStepChange(4)}
          onSelectNote={handleSelectNote}
          onOpenTradePayables={handleOpenTradePayables}
        />
      )}

      {currentStep === 4 && (
        <Step4NotesAndAudit
          config={config}
          noteSchedules={computedFinancials.noteSchedules}
          exceptions={allExceptions}
          balanceSheet={computedFinancials.balanceSheet}
          profitAndLoss={computedFinancials.profitAndLoss}
          onUpdateConfig={onUpdateConfig}
          onSelectNote={setSelectedNoteNumber}
          selectedNoteNumber={selectedNoteNumber}
          onOpenYearEndAdjustments={onOpenYearEndAdjustments}
          onOpenTradePayables={handleOpenTradePayables}
          onBackToStep3={() => handleStepChange(3)}
          onProceedToStep5={() => handleStepChange(5)}
        />
      )}

      {currentStep === 5 && (
        <Step5ReportGeneration
          config={config}
          computedFinancials={computedFinancials}
          exceptions={allExceptions}
          onExportExcel={onExportExcel}
          onOpenBackupRestore={onOpenBackupRestore}
          currentUser={currentUser}
          onOpenSubscriptionModal={onOpenSubscriptionModal}
          user={user}
          accessToken={accessToken}
          onAuthSuccess={onAuthSuccess}
          onSignOut={onSignOut}
          onBackToStep4={() => handleStepChange(4)}
          onSwitchCompany={onSwitchCompany}
        />
      )}

      {/* Global Trade Payables (Note 9) MSME & Aging Disclosures Modal */}
      <TradePayablesMsmeModal
        isOpen={isTradePayablesModalOpen}
        onClose={() => setIsTradePayablesModalOpen(false)}
        config={config}
        onUpdateConfig={onUpdateConfig}
        noteSchedule={computedFinancials.noteSchedules[9]}
      />
    </div>
  );
};
